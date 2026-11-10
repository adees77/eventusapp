"use client";

import { Check, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { textareaClass } from "@/components/panel";
import { cancelDeal, confirmDeal, openDispute, unconfirmDeal } from "@/lib/data/actions";
import { useDB } from "@/lib/data/store";
import type { Booking, EscrowState } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { escrowOf } from "@/lib/payments/escrow";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

const TONE: Record<EscrowState, string> = {
  none: "bg-gold",
  held: "bg-primary",
  released: "bg-success",
  refunded: "bg-muted-foreground",
  disputed: "bg-destructive",
};

export function EscrowBadge({ booking, className }: { booking: Pick<Booking, "escrow" | "prepayAmount">; className?: string }) {
  const { t } = useI18n();
  const e = escrowOf(booking);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-text-secondary", className)}>
      <span className={cn("size-1.5 rounded-full", TONE[e.state])} aria-hidden />
      {t(`escrow.states.${e.state}`)}
    </span>
  );
}

/** Paid → Frozen → Agreed → Transferred, as a quiet stepper */
export function EscrowTimeline({ booking }: { booking: Booking }) {
  const { t } = useI18n();
  const e = escrowOf(booking);
  const steps = [
    { key: "paid", done: e.state !== "none" },
    { key: "frozen", done: e.state !== "none" },
    {
      key: "agreed",
      done: e.state === "released" || (!!e.clientConfirmedAt && !!e.vendorConfirmedAt),
    },
    { key: "transferred", done: e.state === "released" },
  ] as const;
  if (e.state === "refunded" || e.state === "disputed") return null;
  return (
    <ol className="flex items-center gap-2 text-2xs text-muted-foreground" aria-label={t("escrow.title")}>
      {steps.map((s, i) => (
        <li key={s.key} className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-full border",
              s.done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
            )}
          >
            {s.done && <Check className="size-2.5" strokeWidth={3} />}
          </span>
          <span className={cn("truncate", s.done && "text-foreground")}>{t(`escrow.timeline.${s.key}`)}</span>
          {i < steps.length - 1 && <span className={cn("h-px flex-1", s.done ? "bg-primary/40" : "bg-border")} aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

/**
 * The deal block in a chat: frozen amount, who has confirmed, and the actions
 * for the current side. Both sides see the same card and update in realtime.
 */
export function DealCard({ booking, className }: { booking: Booking; className?: string }) {
  const { t, money } = useI18n();
  const actor = useActor();
  const vendorOwner = useDB((db) => db.vendors.find((v) => v.id === booking.vendorId)?.ownerId);
  const feePercent = useDB((db) => db.settings.feePercent);
  const [dialog, setDialog] = useState<"cancel" | "dispute" | null>(null);
  const [reason, setReason] = useState("");
  const e = escrowOf(booking);
  const party = actor.id === booking.clientId ? "client" : actor.id === vendorOwner ? "vendor" : null;
  const mine = party === "client" ? e.clientConfirmedAt : party === "vendor" ? e.vendorConfirmedAt : undefined;
  const other = party === "client" ? e.vendorConfirmedAt : e.clientConfirmedAt;

  function run(fn: () => void, ok?: string) {
    try {
      fn();
      if (ok) toast.success(ok);
    } catch {
      toast.error(t("common.error"));
    }
  }

  const explain =
    e.state === "held"
      ? t("escrow.explainHeld", { amount: money(e.amount) })
      : e.state === "released"
        ? t("escrow.explainReleased", { amount: money(e.amount) })
        : e.state === "refunded"
          ? t("escrow.explainRefunded", { amount: money(e.amount) })
          : e.state === "disputed"
            ? t("escrow.explainDisputed")
            : t("escrow.explainPending");

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4", className)} aria-label={t("escrow.title")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            e.state === "released" ? "bg-success/10 text-success" : "bg-secondary text-primary",
          )}
        >
          {e.state === "released" ? (
            <ShieldCheck className="size-[18px]" strokeWidth={1.5} />
          ) : (
            <Lock className="size-4" strokeWidth={1.5} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="text-sm font-medium">{t("escrow.title")}</h3>
            <span className="text-md font-medium tabular-nums">{money(e.amount)}</span>
          </div>
          <EscrowBadge booking={booking} className="mt-0.5" />
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{explain}</p>
        </div>
      </div>

      {e.state === "held" && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["client", "vendor"] as const).map((side) => {
              const at = side === "client" ? e.clientConfirmedAt : e.vendorConfirmedAt;
              return (
                <div key={side} className={cn("rounded-xl border px-3 py-2.5", at ? "border-success/30 bg-success/5" : "border-border")}>
                  <div className="text-2xs text-muted-foreground">
                    {t(`escrow.${side}`)}
                    {party === side && ` · ${t("escrow.you")}`}
                  </div>
                  <div className={cn("mt-0.5 flex items-center gap-1.5 text-sm", at ? "text-success" : "text-text-secondary")}>
                    {at ? <Check className="size-3.5" strokeWidth={2.5} /> : <span className="size-1.5 rounded-full bg-gold" aria-hidden />}
                    {at ? t("escrow.confirmed") : t("escrow.waiting")}
                  </div>
                </div>
              );
            })}
          </div>

          {party && (
            <div className="mt-4 flex flex-col gap-2">
              {mine ? (
                <Button variant="outline" className="h-10" onClick={() => run(() => unconfirmDeal(actor, booking.id))}>
                  {t("escrow.unconfirm")}
                </Button>
              ) : (
                <>
                  <Button
                    className="h-11"
                    onClick={() =>
                      run(() => {
                        const next = confirmDeal(actor, booking.id);
                        toast.success(next.state === "released" ? t("escrow.releasedToast") : t("escrow.confirmedToast"));
                      })
                    }
                  >
                    <Check />
                    {t("escrow.confirm")}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">{t("escrow.confirmHint")}</p>
                </>
              )}
              <div className="flex justify-center gap-4 pt-1 text-xs">
                <button
                  type="button"
                  className="text-text-secondary hover:text-foreground hover:underline"
                  onClick={() => setDialog("cancel")}
                >
                  {t("escrow.cancel")}
                </button>
                <button
                  type="button"
                  className="text-text-secondary hover:text-destructive hover:underline"
                  onClick={() => setDialog("dispute")}
                >
                  {t("escrow.dispute")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {e.state !== "none" && e.state !== "held" && (
        <div className="mt-4">
          <EscrowTimeline booking={booking} />
        </div>
      )}
      {party === "vendor" && e.state === "held" && (
        <p className="mt-3 text-2xs text-muted-foreground">{t("escrow.fee", { p: feePercent })}</p>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === "cancel" ? t("escrow.cancelTitle") : t("escrow.disputeTitle")}</DialogTitle>
            <DialogDescription>
              {dialog === "cancel" ? t("escrow.cancelText", { amount: money(e.amount) }) : t("escrow.disputeText")}
            </DialogDescription>
          </DialogHeader>
          {dialog === "dispute" && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-text-secondary">{t("escrow.disputeReason")}</span>
              <textarea
                value={reason}
                onChange={(ev) => setReason(ev.target.value)}
                rows={4}
                maxLength={600}
                className={textareaClass}
                autoFocus
              />
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              {t("common.back")}
            </Button>
            {dialog === "cancel" ? (
              <Button
                variant="destructive"
                onClick={() => {
                  run(() => cancelDeal(actor, booking.id), t("escrow.refundedToast"));
                  setDialog(null);
                }}
              >
                {t("escrow.cancel")}
              </Button>
            ) : (
              <Button
                disabled={!reason.trim()}
                onClick={() => {
                  run(() => openDispute(actor, booking.id, reason), t("escrow.disputeOpened"));
                  setDialog(null);
                  setReason("");
                }}
              >
                {t("escrow.disputeSubmit")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Three steps explaining the escrow — checkout and landing */
export function EscrowSteps({ className }: { className?: string }) {
  const { t } = useI18n();
  const steps = [
    ["pay", "payText"],
    ["hold", "holdText"],
    ["both", "bothText"],
  ] as const;
  return (
    <ol className={cn("grid gap-4 sm:grid-cols-3", className)}>
      {steps.map(([title, text], i) => (
        <li key={title} className="flex gap-3 sm:flex-col sm:gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-gold/60 font-serif text-sm text-gold-foreground tabular-nums">
            {i + 1}
          </span>
          <div>
            <div className="text-sm font-medium">{t(`escrow.steps.${title}`)}</div>
            <div className="mt-0.5 text-xs leading-relaxed text-text-secondary">{t(`escrow.steps.${text}`)}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
