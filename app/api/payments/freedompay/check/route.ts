import { auditPayload, readCallback, str } from "@/lib/payments/freedompay/callback";
import { freedomPay, isFreedomPayConfigured } from "@/lib/payments/freedompay/server";
import { isUuid, logEvent } from "@/lib/payments/freedompay/settle";
import { xmlReply } from "@/lib/payments/freedompay/xml";
import { serviceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const xml = (status: "ok" | "rejected", description?: string) =>
  new Response(xmlReply(status, description), { headers: { "content-type": "text/xml; charset=utf-8" } });

/**
 * FreedomPay check request (pg_check_url), before the card is charged — only when FreedomPay has
 * turned checks on for the merchant. Not retried; no answer within 30 s = the client pays anyway,
 * so payment_succeeded re-checks everything again.
 */
async function handle(req: Request) {
  if (!isFreedomPayConfigured()) return new Response("not configured", { status: 501 });
  const params = await readCallback(req);
  if (!freedomPay().verifyCallback(req.url, params)) return xml("rejected", "Bad signature");

  const paymentId = str(params.pg_order_id);
  const providerId = str(params.pg_payment_id);
  await logEvent("check", paymentId, providerId, auditPayload(params));
  if (!isUuid(paymentId)) return xml("rejected", "Unknown order");

  const { data, error } = await serviceClient().rpc("payment_check", {
    p_payment: paymentId,
    p_provider_payment_id: providerId,
    p_amount: Number(str(params.pg_amount)),
    p_currency: str(params.pg_currency),
  });
  if (error) {
    console.error("[freedompay] check", paymentId, error.message);
    return xml("rejected", "Temporary error, try again");
  }
  return data ? xml("ok") : xml("rejected", "Booking is no longer available");
}

export const POST = handle;
export const GET = handle;
