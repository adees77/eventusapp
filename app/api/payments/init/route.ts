import { z } from "zod";
import { FreedomPayError } from "@/lib/payments/freedompay/api";
import { freedomPay, isFreedomPayConfigured } from "@/lib/payments/freedompay/server";
import { publicBase, settleFailed } from "@/lib/payments/freedompay/settle";
import { routes } from "@/lib/routes";
import { isServiceConfigured, serviceClient, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({ bookingId: z.uuid(), language: z.enum(["ru", "en"]).optional() });

/** Postgres errors of start_payment → HTTP */
const STATUS: Record<string, [number, string]> = {
  P0002: [404, "not_found"],
  P0001: [409, "unavailable"],
  "22023": [409, "state"],
  "42501": [401, "auth"],
};

/**
 * POST /api/payments/init {bookingId} — the signed-in client starts paying the prepayment.
 * Creates the attempt (start_payment under the caller's RLS), opens a FreedomPay payment page and
 * returns its url. The booking is marked paid only by the result webhook (or the status check).
 */
export async function POST(req: Request) {
  if (!isFreedomPayConfigured() || !isServiceConfigured()) return Response.json({ error: "not_configured" }, { status: 501 });
  const db = userClient(req);
  if (!db) return Response.json({ error: "auth" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const { bookingId, language } = parsed.data;

  const { data, error } = await db.rpc("start_payment", { p_booking: bookingId });
  if (error) {
    const [status, code] = STATUS[error.code] ?? [500, "error"];
    return Response.json({ error: code }, { status });
  }
  const p = data?.[0];
  if (!p) return Response.json({ error: "error" }, { status: 500 });

  const base = publicBase(req);
  const back = `${base}${routes.checkout(bookingId)}?payment=${p.payment_id}`;
  try {
    const page = await freedomPay().initPayment({
      orderId: p.payment_id,
      amount: p.amount,
      currency: p.currency as "KGS",
      description: p.description,
      resultUrl: `${base}/api/payments/freedompay/result`,
      checkUrl: `${base}/api/payments/freedompay/check`,
      successUrl: back,
      failureUrl: `${back}&failed=1`,
      // the pending booking holds its units for 15 minutes
      lifetimeSec: 900,
      idempotencyKey: p.payment_id,
      language,
    });
    const { error: attachError } = await serviceClient().rpc("attach_payment", {
      p_payment: p.payment_id,
      p_provider_payment_id: page.paymentId,
      p_redirect_url: page.redirectUrl,
      p_testing: process.env.FREEDOMPAY_TESTING === "1",
    });
    if (attachError) throw attachError;
    return Response.json({ paymentId: p.payment_id, redirectUrl: page.redirectUrl });
  } catch (e) {
    const fp = e instanceof FreedomPayError ? e : null;
    console.error("[freedompay] init", p.payment_id, e instanceof Error ? e.message : e);
    // a transport error leaves the outcome unknown: the attempt stays 'created' and is never paid into
    if (fp && fp.kind !== "transport") await settleFailed(p.payment_id, "", fp.code ?? fp.kind, fp.message).catch(() => {});
    return Response.json({ error: "provider" }, { status: 502 });
  }
}
