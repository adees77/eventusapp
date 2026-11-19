"use client";

import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { fetchPaymentStatus, type PaymentState } from "@/lib/payments/provider";
import { routes } from "@/lib/routes";

type View = "checking" | "paid" | "failed" | "refunded" | "slow";

const POLL_MS = 2500;
const GIVE_UP_MS = 90_000;

function viewOf(s: PaymentState): View | null {
  if (s === "paid") return "paid";
  if (s === "failed") return "failed";
  if (s === "rejected" || s === "refund_pending" || s === "refunded") return "refunded";
  return null;
}

/**
 * The client is back from the FreedomPay page (`?payment=<id>`). The redirect itself proves nothing:
 * we wait for the server to see the payment (webhook or status reconciliation), then go to the chat.
 */
export function PaymentReturn({ paymentId, failedHint, onRetry }: { paymentId: string; failedHint: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [view, setView] = useState<View>("checking");

  useEffect(() => {
    let stop = false;
    const started = Date.now();
    async function tick() {
      try {
        const s = await fetchPaymentStatus(paymentId);
        const v = viewOf(s.status);
        if (stop) return;
        if (v === "paid") {
          setView("paid");
          track("prepayment_paid", { category: "unknown" });
          if (s.conversationId) setTimeout(() => router.push(routes.chat(s.conversationId!)), 1600);
          return;
        }
        if (v) return setView(v);
      } catch {
        /* network blip — keep polling */
      }
      if (stop) return;
      // the provider said «failed» in the url, and the server still has nothing → don't make them wait
      if (failedHint && Date.now() - started > POLL_MS) return setView("failed");
      if (Date.now() - started > GIVE_UP_MS) return setView("slow");
      setTimeout(() => void tick(), POLL_MS);
    }
    void tick();
    return () => {
      stop = true;
    };
  }, [paymentId, failedHint, router]);

  const icon =
    view === "checking" || view === "slow" ? (
      <Loader2 className="size-6 animate-spin" strokeWidth={2} />
    ) : view === "paid" ? (
      <Check className="size-6" strokeWidth={2} />
    ) : (
      <X className="size-6" strokeWidth={2} />
    );

  return (
    <div className="flex animate-rise flex-col items-center py-16 text-center" aria-live="polite">
      <span className={view === "paid" ? "flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground" : "flex size-14 items-center justify-center rounded-full bg-cream text-ink"}>
        {icon}
      </span>
      <h1 className="mt-6 font-heading text-[32px] leading-tight font-normal tracking-[-0.025em] md:text-4xl">
        {view === "paid" ? t("checkout.success") : t(`checkout.return.${view}`)}
      </h1>
      <p className="mt-2 max-w-sm text-md text-text-secondary">
        {view === "paid" ? t("checkout.successHint") : t(`checkout.return.${view}Hint`)}
      </p>
      {(view === "failed" || view === "refunded") && (
        <Button className="mt-8 h-11 rounded-full px-6" onClick={onRetry}>
          {t("checkout.return.retry")}
        </Button>
      )}
    </div>
  );
}
