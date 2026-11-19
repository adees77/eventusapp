/**
 * Payment provider abstraction (browser side).
 *
 * DEMO: `DemoPaymentProvider` simulates a successful prepayment — no money moves and no card data
 * is collected anywhere in the app.
 *
 * FreedomPay (`NEXT_PUBLIC_PAYMENT_PROVIDER=freedompay`, live mode only): the server creates the
 * payment (app/api/payments/init, secret keys never reach the browser) and the client goes to the
 * FreedomPay page. The booking becomes prepaid only when FreedomPay confirms to the server
 * (webhook app/api/payments/freedompay/result, or status reconciliation). Needs the booking to live
 * in Supabase — turn the flag on only after bookings are moved there (stage 4).
 */
import { liveAccessToken } from "@/lib/auth/supabase";
import { isDemoMode } from "@/lib/demo/mode";

export type PaymentMethod = "card" | "qr" | "wallet";

export interface CreatePaymentInput {
  bookingId: string;
  amount: number;
  currency: "KGS";
  method: PaymentMethod;
  description: string;
  language?: "ru" | "en";
}

export interface PaymentResult {
  status: "succeeded" | "failed" | "redirect";
  reference: string;
  /** Hosted payment page for real providers */
  redirectUrl?: string;
  /** `unavailable` — the units were taken meanwhile; other codes — app/api/payments/init */
  error?: string;
}

export type PaymentState = "created" | "pending" | "paid" | "failed" | "rejected" | "refund_pending" | "refunded";

export interface PaymentStatusResult {
  status: PaymentState;
  conversationId: string | null;
}

export interface PaymentProvider {
  readonly id: string;
  readonly isDemo: boolean;
  pay(input: CreatePaymentInput): Promise<PaymentResult>;
}

export const DemoPaymentProvider: PaymentProvider = {
  id: "demo",
  isDemo: true,
  async pay(input) {
    await new Promise((r) => setTimeout(r, 1400));
    return {
      status: "succeeded",
      reference: `DEMO-${input.bookingId.slice(-6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    };
  },
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await liveAccessToken();
  if (!token) throw new Error("Not signed in");
  return { authorization: `Bearer ${token}` };
}

export const FreedomPayProvider: PaymentProvider = {
  id: "freedompay",
  isDemo: false,
  async pay(input) {
    const res = await fetch("/api/payments/init", {
      method: "POST",
      headers: { "content-type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ bookingId: input.bookingId, language: input.language }),
    });
    const data = (await res.json().catch(() => ({}))) as { paymentId?: string; redirectUrl?: string; error?: string };
    if (!res.ok || !data.redirectUrl) return { status: "failed", reference: "", error: data.error ?? "error" };
    return { status: "redirect", reference: data.paymentId ?? "", redirectUrl: data.redirectUrl };
  },
};

/** After FreedomPay sends the client back: the server's view of the attempt */
export async function fetchPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
  const res = await fetch(`/api/payments/status?payment=${encodeURIComponent(paymentId)}`, { headers: await authHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return (await res.json()) as PaymentStatusResult;
}

export function getPaymentProvider(): PaymentProvider {
  if (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === "freedompay" && !isDemoMode()) return FreedomPayProvider;
  return DemoPaymentProvider;
}
