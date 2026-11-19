/**
 * Minimal XML for FreedomPay: responses are `<response>` with flat `pg_*` children and, in
 * get_status3, a few nested lists. No attributes are used. Repeated child names → array.
 */
import type { FpParams, FpValue } from "./sign";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === "#" ? String.fromCodePoint(parseInt(e.slice(e[1] === "x" ? 2 : 1), e[1] === "x" ? 16 : 10)) : ENTITIES[e.toLowerCase()],
  );
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&${Object.keys(ENTITIES).find((k) => ENTITIES[k] === c)};`);
}

const ELEMENT = /<([A-Za-z_][\w.-]*)(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/\1\s*>)/g;
const CDATA = /^<!\[CDATA\[([\s\S]*)\]\]>$/;

function node(inner: string | undefined): FpValue {
  const s = (inner ?? "").trim();
  const cdata = CDATA.exec(s);
  if (cdata) return cdata[1];
  if (!s.includes("<")) return decode(s);
  const out: FpParams = {};
  for (const m of s.matchAll(ELEMENT)) {
    const v = node(m[2]);
    const prev = out[m[1]];
    out[m[1]] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
}

/** Children of the root element */
export function parseXml(xml: string): FpParams {
  const body = xml.replace(/<\?xml[\s\S]*?\?>/, "").trim();
  const root = new RegExp(ELEMENT.source).exec(body);
  if (!root) throw new Error("FreedomPay: not XML");
  const v = node(root[2]);
  return typeof v === "object" && !Array.isArray(v) ? v : {};
}

/** Our answer to result/check callbacks: `<response><pg_status>ok|rejected</pg_status>…` */
export function xmlReply(status: "ok" | "rejected", description?: string): string {
  const desc = description ? `<pg_description>${escape(description)}</pg_description>` : "";
  return `<?xml version="1.0" encoding="utf-8"?><response><pg_status>${status}</pg_status>${desc}</response>`;
}
