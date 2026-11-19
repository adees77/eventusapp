import { FreedomPayError } from "@/lib/payments/freedompay/api";
import { freedomPay, isFreedomPayConfigured } from "@/lib/payments/freedompay/server";
import { isUuid, logEvent, settleFailed, settlePaid } from "@/lib/payments/freedompay/settle";
import { isServiceConfigured, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/status?payment=<id> — the checkout polls this after FreedomPay sends the client
 * back. Reads under the caller's RLS. While the attempt is still `pending`, asks FreedomPay itself
 * (get_status3) and settles — so a lost or delayed webhook (or localhost) doesn't leave the client hanging.
 */
export async function GET(req: Request) {
  const db = userClient(req);
  if (!db) return Response.json({ error: "auth" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("payment") ?? "";
  if (!isUuid(id)) return Response.json({ error: "invalid" }, { status: 400 });

  const read = async () => {
    const { data } = await db.from("payments").select("id, booking_id, status, provider_payment_id").eq("id", id).maybeSingle();
    return data;
  };
  let p = await read();
  if (!p) return Response.json({ error: "not_found" }, { status: 404 });

  if (p.status === "pending" && p.provider_payment_id && isFreedomPayConfigured() && isServiceConfigured()) {
    try {
      const s = await freedomPay().getStatus({ paymentId: p.provider_payment_id });
      await logEvent("status", p.id, p.provider_payment_id, { status: s.status, captured: s.captured, amount: s.amount });
      if (s.status === "success") {
        await settlePaid({
          paymentId: p.id,
          providerPaymentId: p.provider_payment_id,
          amount: s.amount,
          currency: s.currency ?? "",
          testing: s.testing,
          canReject: false,
        });
      } else if (s.status === "error") {
        await settleFailed(p.id, p.provider_payment_id, "status", "error");
      }
      p = (await read()) ?? p;
    } catch (e) {
      if (!(e instanceof FreedomPayError)) throw e;
      console.error("[freedompay] status", p.id, e.message);
    }
  }

  const { data: conv } = await db.from("conversations").select("id").eq("booking_id", p.booking_id).maybeSingle();
  return Response.json({ status: p.status, bookingId: p.booking_id, conversationId: conv?.id ?? null });
}
