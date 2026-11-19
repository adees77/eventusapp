import "server-only";
/**
 * Applying FreedomPay outcomes to our database — shared by the result webhook and by the status
 * reconciliation (a callback that never arrived, e.g. on localhost). All writes go through the
 * service_role RPCs of supabase/migrations/20261119120000_payments.sql.
 */
import { serviceClient } from "@/lib/supabase/server";
import { FreedomPayError } from "./api";
import { freedomPay } from "./server";

export interface PaidNotice {
  paymentId: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  cardPan?: string;
  testing: boolean;
  /** FreedomPay lets us refuse the payment by answering `rejected` (it returns the money itself) */
  canReject: boolean;
}

export type SettleResult = { reply: "ok" | "rejected"; outcome: "ok" | "duplicate" | "refund" | "unknown"; conversationId?: string };

export async function settlePaid(n: PaidNotice): Promise<SettleResult> {
  const db = serviceClient();
  const { data, error } = await db.rpc("payment_succeeded", {
    p_payment: n.paymentId,
    p_provider_payment_id: n.providerPaymentId,
    p_amount: n.amount,
    p_currency: n.currency,
    p_card_pan: n.cardPan ?? "",
    p_testing: n.testing,
  });
  if (error) throw error;
  const r = (data ?? {}) as { outcome?: SettleResult["outcome"]; conversation?: string };
  const outcome = r.outcome ?? "unknown";
  if (outcome === "ok" || outcome === "duplicate") return { reply: "ok", outcome, conversationId: r.conversation };
  if (outcome === "unknown") return { reply: n.canReject ? "rejected" : "ok", outcome };

  // paid, but the booking can't be held (taken meanwhile, cancelled, wrong sum) → the money goes back
  if (n.canReject) {
    await db.rpc("payment_closed", { p_payment: n.paymentId, p_status: "rejected" });
    return { reply: "rejected", outcome };
  }
  try {
    await freedomPay().cancel(n.providerPaymentId, `refund-${n.paymentId}`);
    await db.rpc("payment_closed", { p_payment: n.paymentId, p_status: "refunded" });
  } catch (e) {
    // stays refund_pending: visible to the admin, retried by reconciliation
    if (!(e instanceof FreedomPayError)) throw e;
    console.error("[freedompay] refund failed", n.paymentId, e.message);
  }
  return { reply: "ok", outcome };
}

export async function settleFailed(paymentId: string, providerPaymentId: string, code: string, description: string) {
  const { error } = await serviceClient().rpc("payment_failed", {
    p_payment: paymentId,
    p_provider_payment_id: providerPaymentId,
    p_code: code,
    p_description: description,
  });
  if (error) throw error;
}

export async function logEvent(kind: "check" | "result" | "refund" | "status", paymentId: string | null, providerPaymentId: string, payload: Record<string, unknown>) {
  const row = (id: string | null) => ({ payment_id: id, provider_payment_id: providerPaymentId || null, kind, payload: payload as never });
  const db = serviceClient();
  let { error } = await db.from("payment_events").insert(row(paymentId && isUuid(paymentId) ? paymentId : null));
  // not one of our payments (foreign key) — keep the event anyway, unlinked
  if (error?.code === "23503") ({ error } = await db.from("payment_events").insert(row(null)));
  if (error) console.error("[freedompay] audit log", error.message);
}

/** Absolute base for the urls we give FreedomPay. Callbacks must reach it from the internet. */
export function publicBase(req: Request): string {
  return (process.env.PAYMENTS_PUBLIC_URL || new URL(req.url).origin).replace(/\/$/, "");
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
