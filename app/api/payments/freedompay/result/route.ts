import { auditPayload, readCallback, str } from "@/lib/payments/freedompay/callback";
import { freedomPay, isFreedomPayConfigured } from "@/lib/payments/freedompay/server";
import { logEvent, settleFailed, settlePaid } from "@/lib/payments/freedompay/settle";
import { xmlReply } from "@/lib/payments/freedompay/xml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const xml = (status: "ok" | "rejected", description?: string, httpStatus = 200) =>
  new Response(xmlReply(status, description), { status: httpStatus, headers: { "content-type": "text/xml; charset=utf-8" } });

/**
 * FreedomPay result notify (pg_result_url): the payment finished. Sent once, retried after 15 and
 * 2×30 minutes until we answer 2xx — so it must be idempotent (payment_succeeded is).
 * A non-2xx answer (our DB is down) makes FreedomPay retry; a bad signature is refused for good.
 */
async function handle(req: Request) {
  if (!isFreedomPayConfigured()) return new Response("not configured", { status: 501 });
  const params = await readCallback(req);
  if (!freedomPay().verifyCallback(req.url, params)) return new Response("bad signature", { status: 400 });

  const paymentId = str(params.pg_order_id);
  const providerId = str(params.pg_payment_id);
  const canReject = params.pg_can_reject === "1";
  await logEvent("result", paymentId, providerId, auditPayload(params));

  try {
    if (params.pg_result === "1") {
      const r = await settlePaid({
        paymentId,
        providerPaymentId: providerId,
        amount: Number(str(params.pg_amount)),
        currency: str(params.pg_currency),
        cardPan: str(params.pg_card_pan) || undefined,
        testing: params.pg_testing_mode === "1",
        canReject,
      });
      return xml(r.reply, r.outcome === "ok" || r.outcome === "duplicate" ? undefined : "Booking is no longer available");
    }
    if (params.pg_result === "0") await settleFailed(paymentId, providerId, str(params.pg_failure_code), str(params.pg_failure_description));
    // pg_result=2 (not finished yet) — nothing to do
    return xml("ok");
  } catch (e) {
    console.error("[freedompay] result", paymentId, e instanceof Error ? e.message : e);
    return new Response("temporary error", { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
