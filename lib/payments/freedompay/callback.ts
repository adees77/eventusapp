/**
 * FreedomPay → our server: reading a callback body and keeping only what we store.
 * Body: form (default), or `pg_xml` with an XML `<request>` (pg_request_method=XML), or GET query.
 */
import { fromForm, type FpParams } from "./sign";
import { parseXml } from "./xml";

export async function readCallback(req: Request): Promise<FpParams> {
  const url = new URL(req.url);
  const query = fromForm(url.searchParams.entries());
  if (req.method === "GET") return query;
  const type = req.headers.get("content-type") ?? "";
  let body: FpParams = {};
  if (type.includes("xml")) body = parseXml(await req.text());
  else if (type.includes("json")) body = (await req.json()) as FpParams;
  else body = fromForm(new URLSearchParams(await req.text()).entries());
  if (typeof body.pg_xml === "string") body = parseXml(body.pg_xml);
  // query params of our own url are signed too (docs: "parameters of the query string of your URL")
  return { ...query, ...body };
}

/** Personal data is not kept in the audit log: phone, email, IP, card owner, card token */
const DROP = new Set(["pg_user_phone", "pg_user_contact_email", "pg_user_ip", "pg_card_owner", "pg_card_token", "pg_card_id", "pg_sig", "pg_salt"]);

export function auditPayload(p: FpParams): Record<string, unknown> {
  return Object.fromEntries(Object.entries(p).filter(([k]) => !DROP.has(k)));
}

export const str = (v: unknown): string => (typeof v === "string" ? v : "");
