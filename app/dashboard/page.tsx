"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { Check, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { BookingRow } from "@/components/booking/booking-row";
import { CategoryIcon } from "@/components/category-icon";
import { DatePicker } from "@/components/date-picker";
import { Empty, Field, PageHeader, Section, inputClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LinkButton } from "@/components/ui/link-button";
import { NativeSelect } from "@/components/ui/native-select";
import { VendorCard } from "@/components/vendor/vendor-card";
import { createEvent, setBookingStatus, setChecklist, updateEvent } from "@/lib/data/actions";
import { activeOffers, minPrice } from "@/lib/data/queries";
import { CITIES } from "@/lib/data/seed/catalog";
import { useDB } from "@/lib/data/store";
import type { EventItem } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { t, tn, l, money, date } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const events = db.events.filter((e) => e.clientId === actor.id).sort((a, b) => a.date.localeCompare(b.date));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const event = events.find((e) => e.id === selectedId) ?? events[0];
  const [editing, setEditing] = useState<EventItem | "new" | null>(null);
  const [newTask, setNewTask] = useState("");

  if (actor.role !== "client") {
    return (
      <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center text-sm text-text-secondary">
        {t("vendor.onlyClients")}
      </div>
    );
  }

  const bookings = db.bookings.filter((b) => b.clientId === actor.id).sort((a, b) => a.date.localeCompare(b.date));
  const eventBookings = event ? bookings.filter((b) => b.eventId === event.id && b.status !== "cancelled") : [];
  const booked = eventBookings.reduce((s, b) => s + b.total, 0);
  const prepaid = eventBookings.filter((b) => b.status !== "pending").reduce((s, b) => s + b.prepayAmount, 0);
  const favorites = db.favorites
    .filter((f) => f.userId === actor.id)
    .map((f) => db.vendors.find((v) => v.id === f.vendorId))
    .filter((v): v is NonNullable<typeof v> => !!v && !v.hidden);
  const days = event ? differenceInCalendarDays(parseISO(event.date), new Date()) : 0;
  const share = event && event.budget ? Math.min(1, booked / event.budget) : 0;

  function toggleTask(id: string) {
    if (!event) return;
    setChecklist(actor, event.id, event.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  }

  function addTask() {
    if (!event || !newTask.trim()) return;
    setChecklist(actor, event.id, [...event.checklist, { id: `c-${event.checklist.length + 1}-${event.checklist.map((c) => c.id).join("").length}`, title: newTask.trim().slice(0, 80), done: false }]);
    setNewTask("");
  }

  return (
    <div className="container-app pt-8 pb-16 md:pt-12">
      <PageHeader
        title={t("dashboard.title")}
        action={
          <div className="flex gap-2">
            {events.length > 1 && (
              <NativeSelect value={event?.id} onChange={(e) => setSelectedId(e.target.value)} aria-label={t("dashboard.title")}>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </NativeSelect>
            )}
            <Button variant="outline" className="h-10 px-4" onClick={() => setEditing("new")}>
              <Plus />
              {t("dashboard.newEvent")}
            </Button>
          </div>
        }
      />

      {!event ? (
        <Section title={t("dashboard.title")} className="mt-8">
          <Empty action={<Button onClick={() => setEditing("new")}>{t("dashboard.newEvent")}</Button>}>{t("dashboard.noEvents")}</Empty>
        </Section>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex min-w-0 flex-col gap-6">
            {/* Event */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-3xl font-normal md:text-4xl">{event.title}</h2>
                  <p className="mt-1 text-sm text-text-secondary tabular-nums">
                    {date(event.date, "d MMMM yyyy, EEEE")} · {l(CITIES[event.city])} · {tn("common.guests", event.guests)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(event)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={t("dashboard.editEvent")}
                >
                  <Pencil className="size-4" strokeWidth={1.5} />
                </button>
              </div>
              {days >= 0 && <p className="mt-4 text-sm text-primary">{tn("dashboard.daysLeft", days)}</p>}

              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                <Figure label={t("dashboard.booked")} value={money(booked)} />
                <Figure label={t("dashboard.prepaidTotal")} value={money(prepaid)} />
                <Figure label={t("dashboard.budgetLeft")} value={money(Math.max(0, event.budget - booked))} />
              </div>
              {event.budget > 0 && (
                <div className="mt-5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full origin-left rounded-full bg-primary transition-transform duration-500" style={{ transform: `scaleX(${share})` }} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                    {Math.round(share * 100)}% {t("common.of")} {money(event.budget)}
                  </div>
                </div>
              )}
            </section>

            {/* Bookings */}
            <Section title={t("dashboard.bookings")}>
              {bookings.length ? (
                <ul className="flex flex-col divide-y divide-border">
                  {bookings.map((b) => {
                    const conv = db.conversations.find((c) => c.bookingId === b.id);
                    return (
                      <BookingRow
                        key={b.id}
                        b={b}
                        perspective="client"
                        actions={
                          <>
                            {b.status === "pending" && (
                              <>
                                <LinkButton href={`/checkout/${b.id}`} className="h-9 px-4">
                                  {t("dashboard.pay")}
                                </LinkButton>
                                <Button
                                  variant="ghost"
                                  className="h-9 px-3 text-muted-foreground"
                                  onClick={() => setBookingStatus(actor, b.id, "cancelled")}
                                >
                                  {t("dashboard.cancel")}
                                </Button>
                              </>
                            )}
                            {conv && (
                              <LinkButton href={`/messages/${conv.id}`} variant="outline" className="h-9 px-4">
                                {t("dashboard.chat")}
                              </LinkButton>
                            )}
                          </>
                        }
                      />
                    );
                  })}
                </ul>
              ) : (
                <Empty action={<LinkButton href="/">{t("nav.assistant")}</LinkButton>}>{t("dashboard.noBookings")}</Empty>
              )}
            </Section>
          </div>

          <div className="flex flex-col gap-6">
            {/* Checklist */}
            <Section title={t("dashboard.checklist")}>
              <ul className="flex flex-col gap-1">
                {event.checklist.map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTask(c.id)}
                      aria-pressed={c.done}
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        c.done ? "border-primary bg-primary text-primary-foreground" : "border-foreground/25 hover:border-primary",
                      )}
                    >
                      {c.done && <Check className="size-3.5" strokeWidth={2.5} />}
                    </button>
                    <span className={cn("flex-1 py-2 text-sm", c.done && "text-muted-foreground line-through decoration-foreground/20")}>
                      {c.title}
                    </span>
                    {c.category && !c.done && (
                      <Link
                        href={`/vendors?category=${c.category}`}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        onClick={() => undefined}
                      >
                        <CategoryIcon id={c.category} className="size-3.5" />
                        {t("dashboard.find")}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addTask();
                }}
              >
                <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder={t("dashboard.addTask")} className={inputClass} maxLength={80} />
                <Button type="submit" variant="outline" className="h-10 px-3" disabled={!newTask.trim()} aria-label={t("common.add")}>
                  <Plus />
                </Button>
              </form>
            </Section>

            {/* Favorites */}
            <Section title={t("dashboard.favorites")}>
              {favorites.length ? (
                <div className="grid gap-6">
                  {favorites.map((v) => {
                    const offers = activeOffers(db, v.id);
                    return (
                      <VendorCard
                        key={v.id}
                        r={{ vendor: v, offers, minPrice: minPrice(offers), availability: null, bestOffer: null, bestOfferAvailability: null }}
                      />
                    );
                  })}
                </div>
              ) : (
                <Empty>{t("dashboard.noFavorites")}</Empty>
              )}
            </Section>
          </div>
        </div>
      )}

      <EventDialog
        value={editing}
        onClose={() => setEditing(null)}
        onSave={(data) => {
          if (editing === "new") {
            const e = createEvent(actor, data);
            setSelectedId(e.id);
            toast.success(t("dashboard.eventCreated"));
          } else if (editing) {
            updateEvent(actor, editing.id, data);
            toast.success(t("common.saved"));
          }
          setEditing(null);
        }}
      />
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-medium tabular-nums">{value}</div>
    </div>
  );
}

type EventData = Pick<EventItem, "title" | "date" | "city" | "guests" | "budget">;

function EventDialog({
  value,
  onClose,
  onSave,
}: {
  value: EventItem | "new" | null;
  onClose: () => void;
  onSave: (d: EventData) => void;
}) {
  const { t, l } = useI18n();
  const open = value !== null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{value === "new" ? t("dashboard.newEvent") : t("dashboard.editEvent")}</DialogTitle>
        </DialogHeader>
        {open && <EventForm key={value === "new" ? "new" : value.id} initial={value === "new" ? null : value} onSave={onSave} onCancel={onClose} l={l} />}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({
  initial,
  onSave,
  onCancel,
  l,
}: {
  initial: EventItem | null;
  onSave: (d: EventData) => void;
  onCancel: () => void;
  l: ReturnType<typeof useI18n>["l"];
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState<string | null>(initial?.date ?? null);
  const [city, setCity] = useState(initial?.city ?? "bishkek");
  const [guests, setGuests] = useState(String(initial?.guests ?? 100));
  const [budget, setBudget] = useState(String(initial?.budget ?? 1000000));
  const valid = title.trim() && date && Number(guests) > 0;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSave({
          title: title.trim().slice(0, 120),
          date: date!,
          city,
          guests: Math.min(10000, Math.max(1, Math.round(Number(guests)))),
          budget: Math.max(0, Math.round(Number(budget) || 0)),
        });
      }}
    >
      <Field label={t("dashboard.eventTitle")}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("dashboard.eventTitlePlaceholder")} className={inputClass} maxLength={120} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("dashboard.date")}>
          <DatePicker value={date} onChange={setDate} clearable={false} placeholder={t("booking.selectDate")} />
        </Field>
        <Field label={t("dashboard.city")}>
          <NativeSelect value={city} onChange={(e) => setCity(e.target.value)}>
            {Object.entries(CITIES).map(([id, name]) => (
              <option key={id} value={id}>
                {l(name)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("dashboard.guests")}>
          <input type="number" inputMode="numeric" min={1} max={10000} value={guests} onChange={(e) => setGuests(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("dashboard.budget")}>
          <input type="number" inputMode="numeric" min={0} step={10000} value={budget} onChange={(e) => setBudget(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={!valid}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
