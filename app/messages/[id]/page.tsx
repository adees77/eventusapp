"use client";

import { format } from "date-fns";
import { ArrowLeft, ArrowUp } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BookingSummary } from "@/components/booking/booking-summary";
import { StatusBadge } from "@/components/booking/status-badge";
import { useCounterpart } from "@/components/messages/conversation-list";
import { DealCard, EscrowBadge } from "@/components/booking/deal-card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Monogram } from "@/components/vendor/badges";
import { demoConfig } from "@/config/demo";
import { markRead, sendAutoReply, sendMessage } from "@/lib/data/actions";
import { can } from "@/lib/data/policies";
import { offerById, vendorById } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { t, l, list, date: fmt } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const conv = db.conversations.find((c) => c.id === id);
  const messages = db.messages.filter((m) => m.conversationId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const booking = conv?.bookingId ? db.bookings.find((b) => b.id === conv.bookingId) : undefined;
  const offer = booking ? offerById(db, booking.offerId) : undefined;
  const vendor = conv ? vendorById(db, conv.vendorId) : undefined;
  const nameOf = useCounterpart();
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const allowed = conv && can.viewConversation(actor, db, conv);
  const lastAt = messages[messages.length - 1]?.createdAt;

  useEffect(() => {
    if (conv && allowed && lastAt && conv.readAt[actor.id] !== lastAt && (conv.readAt[actor.id] ?? "") < lastAt) {
      markRead(actor.id, conv.id);
    }
  }, [conv, allowed, lastAt, actor.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typing]);

  if (!conv || !allowed || !vendor) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-text-secondary">
        {t("messages.notFound")}
        <Link href="/messages" className="text-primary hover:underline">
          {t("messages.title")}
        </Link>
      </div>
    );
  }

  const name = nameOf(conv);
  const isVendor = actor.role === "vendor";
  const dealPanel = booking && offer && (
    <>
      <BookingSummary
        compact
        vendor={vendor}
        offer={offer}
        date={booking.date}
        qty={booking.qty}
        total={booking.total}
        prepay={booking.prepayAmount}
        prepayPercent={vendor.prepayPercent}
      />
      <div className="flex items-center justify-between px-1">
        <StatusBadge status={booking.status} />
        {booking.status === "pending" && actor.id === booking.clientId && (
          <Link href={`/checkout/${booking.id}`} className="text-sm text-primary hover:underline">
            {t("escrow.pay")}
          </Link>
        )}
      </div>
      <DealCard booking={booking} />
      <p className="px-1 text-2xs leading-relaxed text-muted-foreground">{t("escrow.refundPolicy")}</p>
    </>
  );

  function send() {
    const clean = text.trim();
    if (!clean) return;
    try {
      sendMessage(actor, conv!.id, clean);
      setText("");
    } catch {
      toast.error(t("common.error"));
      return;
    }
    // DEMO: vendor answers on its own so a solo presenter sees a live chat
    if (actor.role === "client" && demoConfig.vendorAutoReply) {
      const vendorCount = messages.filter((m) => m.senderId === vendor!.ownerId).length;
      const replies = list("messages.autoReplies");
      setTimeout(() => setTyping(true), 600);
      setTimeout(() => {
        setTyping(false);
        sendAutoReply(conv!.id, replies[vendorCount % replies.length]);
      }, 2400);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-3 py-3 lg:px-5">
        <Link
          href="/messages"
          className="flex size-9 items-center justify-center rounded-lg text-text-secondary hover:bg-muted lg:hidden"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Monogram name={name} className="size-9 rounded-full text-sm" />
        <div className="min-w-0 flex-1">
          {isVendor ? (
            <div className="truncate text-sm font-medium">{name}</div>
          ) : (
            <Link href={`/vendors/${vendor.slug}`} className="truncate text-sm font-medium hover:underline">
              {name}
            </Link>
          )}
          <div className="text-xs text-muted-foreground">
            {typing ? t("messages.typing") : isVendor ? t("vp.client") : t("vendor.response", { n: vendor.responseMinutes })}
          </div>
        </div>
      </header>

      {booking && offer && (
        <div className="flex items-center gap-3 border-b border-border bg-background/60 px-3 py-2.5 lg:px-5 xl:hidden">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">{l(offer.title)}</div>
            <EscrowBadge booking={booking} />
          </div>
          <Button variant="outline" className="h-9" onClick={() => setDealOpen(true)}>
            {t("escrow.title")}
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-3 py-5 lg:px-5">
            <ul className="flex flex-col gap-2">
              {messages.map((m, i) => {
                const mine = m.senderId === actor.id;
                const prev = messages[i - 1];
                const day = format(new Date(m.createdAt), "yyyy-MM-dd");
                const newDay = !prev || format(new Date(prev.createdAt), "yyyy-MM-dd") !== day;
                return (
                  <li key={m.id} className="flex flex-col">
                    {newDay && <div className="my-3 text-center text-xs text-muted-foreground">{fmt(day, "d MMMM")}</div>}
                    {m.system ? (
                      <div className="my-1 self-center px-3 py-1 text-xs text-muted-foreground">
                        {t(`messages.system.${m.text}` as never)}
                      </div>
                    ) : (
                      <div className={cn("flex max-w-[80%] flex-col", mine ? "self-end items-end" : "self-start items-start")}>
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2 text-md leading-relaxed whitespace-pre-wrap",
                            mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground",
                          )}
                        >
                          {m.text}
                        </div>
                        <span className="mt-1 px-1 text-2xs text-muted-foreground tabular-nums">
                          {format(new Date(m.createdAt), "HH:mm")}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
              {typing && (
                <li className="self-start rounded-2xl rounded-bl-md bg-muted px-4 py-3" aria-live="polite">
                  <span className="flex gap-1" aria-label={t("messages.typing")}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-1.5 rounded-full bg-muted-foreground"
                        style={{ animation: `dots 1.2s ${i * 0.16}s infinite` }}
                      />
                    ))}
                  </span>
                </li>
              )}
            </ul>
            <div ref={endRef} />
          </div>

          {can.sendMessage(actor, db, conv) && (
            <form
              className="flex items-end gap-2 border-t border-border p-3 lg:px-5"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder={t("messages.placeholder")}
                aria-label={t("messages.placeholder")}
                className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-md outline-none placeholder:text-muted-foreground focus-visible:border-ring"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                aria-label={t("messages.send")}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[background-color,opacity] hover:bg-primary-hover active:scale-[0.97] disabled:opacity-30"
              >
                <ArrowUp className="size-[18px]" />
              </button>
            </form>
          )}
        </div>
        {booking && offer && (
          <aside className="hidden w-[340px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-border p-4 xl:flex">{dealPanel}</aside>
        )}
      </div>
      {booking && offer && (
        <Sheet open={dealOpen} onOpenChange={setDealOpen}>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl p-4 pt-10">
            <SheetTitle className="sr-only">{t("escrow.title")}</SheetTitle>
            <div className="flex flex-col gap-3">{dealPanel}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
