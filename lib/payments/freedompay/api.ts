/**
 * FreedomPay Merchant API client (pure: config and fetch are injected, so it is unit-tested;
 * the env-bound instance lives in ./server.ts).
 *
 * Methods used by EVENTUS:
 *   init_payment.php  — payment page. Default `autoClearing: true` (one stage, works for cards and QR):
 *                       the money lands on the merchant balance and the deal escrow is our ledger.
 *                       `autoClearing: false` = two-stage hold (cards only, auto-ends after ~5 days).
 *   do_capture.php / cancel — finish or release a hold.   revoke — refund (partial allowed).
 *   get_status3.php   — the truth for reconciliation (a cancelled/refunded payment stays `success`).
 *
 * Errors: `pg_status=error` + `pg_error_code` comes unsigned → FreedomPayError("api").
 * A signed `error` with `pg_failure_code` (cancel/revoke declined) → FreedomPayError("failure").
 * Non-200 / non-XML / timeout → FreedomPayError("transport"): the outcome is UNKNOWN —
 * never retry blindly, ask get_status3 first.
 */
import { salt, scriptOf, sign, toForm, verify, type FpParams } from "./sign";
import { parseXml } from "./xml";

export interface FreedomPayConfig {
  merchantId: string;
  /** payment secret key (all methods except payouts) */
  secretKey: string;
  /** e.g. https://api.freedompay.kg */
  apiUrl: string;
  testing: boolean;
}

export type FreedomPayErrorKind = "api" | "failure" | "signature" | "transport";

export class FreedomPayError extends Error {
  constructor(
    public kind: FreedomPayErrorKind,
    public code?: string,
    description?: string,
  ) {
    super(`FreedomPay ${kind}${code ? ` ${code}` : ""}${description ? `: ${description}` : ""}`);
    this.name = "FreedomPayError";
  }
}

export interface InitPaymentInput {
  /** our payment attempt id (≤ 50 chars), comes back as pg_order_id */
  orderId: string;
  amount: number;
  currency: "KGS" | "KZT" | "USD";
  description: string;
  resultUrl: string;
  successUrl: string;
  failureUrl: string;
  checkUrl?: string;
  /** default true — one-stage payment */
  autoClearing?: boolean;
  /** seconds the client has to pay, 60…604800 */
  lifetimeSec?: number;
  userId?: string;
  idempotencyKey?: string;
  language?: "ru" | "en" | "kg" | "kz" | "uz";
  /** non-`pg_` params, returned untouched in callbacks */
  extra?: Record<string, string>;
}

export interface PaymentStatus {
  status: "new" | "waiting" | "process" | "success" | "error";
  paymentId: string;
  orderId?: string;
  amount: number;
  currency?: string;
  /** 1 = captured, 0 = only held (or released) — cards only */
  captured: boolean;
  clearingAmount: number;
  refundAmount: number;
  revokedAmount: number;
  canReject: boolean;
  testing: boolean;
  raw: FpParams;
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const num = (v: unknown) => Math.abs(Number(str(v) ?? 0)) || 0;
export const money = (n: number) => (Math.round(n * 100) / 100).toString();

export function createFreedomPay(cfg: FreedomPayConfig, fetchImpl: typeof fetch = fetch) {
  async function call(path: string, params: FpParams): Promise<FpParams> {
    const script = scriptOf(path);
    const body: FpParams = { ...params, pg_merchant_id: cfg.merchantId, pg_salt: salt() };
    body.pg_sig = sign(script, body, cfg.secretKey);

    let text: string;
    try {
      const res = await fetchImpl(`${cfg.apiUrl.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: toForm(body),
        signal: AbortSignal.timeout(30_000),
      });
      text = await res.text();
      if (!res.ok) throw new FreedomPayError("transport", String(res.status));
    } catch (e) {
      if (e instanceof FreedomPayError) throw e;
      throw new FreedomPayError("transport", undefined, e instanceof Error ? e.message : String(e));
    }

    let data: FpParams;
    try {
      data = parseXml(text);
    } catch {
      throw new FreedomPayError("transport", undefined, "not XML");
    }
    if (data.pg_status === "error" && data.pg_error_code !== undefined) {
      throw new FreedomPayError("api", str(data.pg_error_code), str(data.pg_error_description));
    }
    if (!verify(script, data, cfg.secretKey)) throw new FreedomPayError("signature");
    if (data.pg_status === "error") {
      throw new FreedomPayError("failure", str(data.pg_failure_code), str(data.pg_failure_description));
    }
    return data;
  }

  return {
    async initPayment(i: InitPaymentInput): Promise<{ paymentId: string; redirectUrl: string }> {
      const d = await call("/init_payment.php", {
        ...i.extra,
        pg_order_id: i.orderId,
        pg_amount: money(i.amount),
        pg_currency: i.currency,
        pg_description: i.description.slice(0, 1024),
        pg_auto_clearing: i.autoClearing === false ? "0" : "1",
        pg_lifetime: i.lifetimeSec,
        pg_result_url: i.resultUrl,
        pg_check_url: i.checkUrl,
        pg_success_url: i.successUrl,
        pg_failure_url: i.failureUrl,
        pg_user_id: i.userId,
        pg_idempotency_key: i.idempotencyKey,
        pg_language: i.language,
        pg_testing_mode: cfg.testing ? "1" : undefined,
      });
      const paymentId = str(d.pg_payment_id);
      const redirectUrl = str(d.pg_redirect_url);
      if (!paymentId || !redirectUrl) throw new FreedomPayError("transport", undefined, "no redirect url");
      return { paymentId, redirectUrl };
    },

    async getStatus(by: { paymentId: string } | { orderId: string }): Promise<PaymentStatus> {
      const d = await call("/get_status3.php", "paymentId" in by ? { pg_payment_id: by.paymentId } : { pg_order_id: by.orderId });
      return {
        status: (str(d.pg_payment_status) ?? "new") as PaymentStatus["status"],
        paymentId: str(d.pg_payment_id) ?? "",
        orderId: str(d.pg_order_id),
        amount: num(d.pg_amount),
        currency: str(d.pg_currency),
        captured: d.pg_captured === "1",
        clearingAmount: num(d.pg_clearing_amount),
        refundAmount: num(d.pg_refund_amount),
        revokedAmount: num(d.pg_revoked_amount),
        canReject: d.pg_can_reject === "1",
        testing: d.pg_testing_mode === "1",
        raw: d,
      };
    },

    /** Finish a hold. Returns the captured amount: 0 means nothing was captured — check getStatus. */
    async capture(paymentId: string, amount?: number): Promise<number> {
      const d = await call("/do_capture.php", { pg_payment_id: paymentId, pg_clearing_amount: amount ? money(amount) : undefined });
      return num(d.pg_clearing_amount);
    },

    /** Release a hold (or fully refund a captured payment). */
    async cancel(paymentId: string, idempotencyKey?: string): Promise<string | undefined> {
      const d = await call("/cancel", { pg_payment_id: paymentId, pg_idempotency_key: idempotencyKey });
      return str(d.pg_cancel_payment_id);
    },

    /** Refund a captured payment, partially if `amount` is given. Not for an uncaptured hold — use cancel. */
    async refund(paymentId: string, amount?: number, idempotencyKey?: string): Promise<string | undefined> {
      const d = await call("/revoke", {
        pg_payment_id: paymentId,
        pg_refund_amount: amount ? money(amount) : undefined,
        pg_idempotency_key: idempotencyKey,
      });
      return str(d.pg_revoke_payment_id);
    },

    /** Check a callback (result / check) that FreedomPay sent to `ourUrl` */
    verifyCallback(ourUrl: string, params: FpParams): boolean {
      return verify(scriptOf(ourUrl), params, cfg.secretKey);
    },
  };
}

export type FreedomPay = ReturnType<typeof createFreedomPay>;
