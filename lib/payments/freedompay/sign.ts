/**
 * FreedomPay Merchant API signature (`pg_sig`).
 *
 *   pg_sig = md5("<script>;<values of all params sorted by name>;<secret>")
 *
 * `script` is the last path segment of the URL the message goes to: `init_payment.php`,
 * `do_capture.php`, `cancel`… and for callbacks — the last segment of OUR url (`…/result` → `result`).
 * Every param except `pg_sig` is signed, `pg_salt` and non-`pg_` params included. Nested params
 * (`pg_receipt_positions[0][name]`) take their place in the sorted list and are sorted inside.
 *
 * Pure (node:crypto only): used by the server client and by the callback route handlers.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type FpValue = string | number | FpParams | FpValue[];
export interface FpParams {
  [name: string]: FpValue | undefined;
}

function entries(p: FpParams): [string, FpValue][] {
  return Object.entries(p)
    .filter((e): e is [string, FpValue] => e[1] !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

function values(v: FpValue): string[] {
  if (Array.isArray(v)) return v.flatMap(values);
  if (typeof v === "object") return entries(v).flatMap(([, x]) => values(x));
  return [String(v)];
}

export function scriptOf(url: string): string {
  const path = url.replace(/^[a-z]+:\/\/[^/]+/i, "").split(/[?#]/)[0];
  return path.split("/").filter(Boolean).pop() ?? "";
}

export function sign(script: string, params: FpParams, secret: string): string {
  const rest = { ...params };
  delete rest.pg_sig;
  return createHash("md5")
    .update([script, ...values(rest), secret].join(";"), "utf8")
    .digest("hex");
}

export function verify(script: string, params: FpParams, secret: string): boolean {
  const got = params.pg_sig;
  if (typeof got !== "string" || got.length !== 32) return false;
  const want = sign(script, params, secret);
  return timingSafeEqual(Buffer.from(got.toLowerCase()), Buffer.from(want));
}

export function salt(): string {
  return randomBytes(8).toString("hex");
}

/** Params → form body with bracket names (`a[0][b]=…`) */
export function toForm(params: FpParams): URLSearchParams {
  const form = new URLSearchParams();
  const walk = (name: string, v: FpValue | undefined) => {
    if (v === undefined) return;
    if (Array.isArray(v)) v.forEach((x, i) => walk(`${name}[${i}]`, x));
    else if (typeof v === "object") for (const [k, x] of Object.entries(v)) walk(`${name}[${k}]`, x);
    else form.append(name, String(v));
  };
  for (const [k, v] of Object.entries(params)) walk(k, v);
  return form;
}

/** Form body (callback) → nested params, the inverse of `toForm`. Numeric segments become arrays. */
export function fromForm(pairs: Iterable<[string, string]>): FpParams {
  const root: FpParams = {};
  for (const [raw, value] of pairs) {
    const [head, ...rest] = raw.split("[");
    const keys = [head, ...rest.map((s) => s.replace(/]$/, ""))];
    let node: FpParams | FpValue[] = root;
    keys.forEach((k, i) => {
      const last = i === keys.length - 1;
      const slot = node as Record<string, FpValue | undefined>;
      if (last) slot[k] = value;
      else {
        if (typeof slot[k] !== "object") slot[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
        node = slot[k] as FpParams | FpValue[];
      }
    });
  }
  return root;
}
