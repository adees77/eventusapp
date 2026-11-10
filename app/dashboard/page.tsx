"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { ArrowRight, Check, CreditCard, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientBookingList } from "@/components/booking/client-booking-list";
import { Masonry, PostCard } from "@/components/feed/post-card";
import { Kpi } from "@/components/layout/cabinet-shell";
import { Empty, Section } from "@/components/panel";
import { LinkButton } from "@/components/ui/link-button";
import { searchPosts } from "@/lib/data/feed";
import { CITIES } from "@/lib/data/seed/catalog";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { invitationStats } from "@/lib/invitations/design";
import { clientMoney, escrowOf } from "@/lib/payments/escrow";
import { useActor } from "@/lib/session";

export default function ClientOverview() {
  const { t, tn, l, money, date } = useI18n();
  const actor = useActor();
  const router = useRouter();
  const db = useDB((d) => d);
  const today = new Date().toISOString().slice(0, 10);
  const user = db.users.find((u) => u.id === actor.id);
  const events = db.events.filter((e) => e.clientId === actor.id).sort((a, b) => a.date.localeCompare(b.date));
  const event = events.find((e) => e.date >= today) ?? events[0];
  const bookings = db.bookings.filter((b) => b.clientId === actor.id).sort((a, b) => a.date.localeCompare(b.date));
  const active = bookings.filter((b) => b.status !== "cancelled");
  const money_ = clientMoney(actor.id, db.bookings);
  const booked = event ? active.filter((b) => b.eventId === event.id).reduce((s, b) => s + b.total, 0) : 0;
  const done = event ? event.checklist.filter((c) => c.done).length : 0;
  const inv = db.invitations.find((i) => i.ownerId === actor.id && (!event || i.eventId === event.id));
  const stats = inv ? invitationStats(inv) : null;
  const days = event ? differenceInCalendarDays(parseISO(event.date), new Date()) : 0;

  const todo = [
    ...bookings
      .filter((b) => b.status === "pending")
      .map((b) => ({
        id: b.id,
        icon: CreditCard,
        text: t("cabinet.todoPay", { vendor: db.vendors.find((v) => v.id === b.vendorId)?.name ?? "" }),
        href: `/checkout/${b.id}`,
      })),
    ...bookings
      .filter((b) => escrowOf(b).state === "held" && !b.escrow?.clientConfirmedAt)
      .map((b) => ({
        id: `c-${b.id}`,
        icon: Lock,
        text: t("cabinet.todoConfirm", { vendor: db.vendors.find((v) => v.id === b.vendorId)?.name ?? "" }),
        href: `/messages/${db.conversations.find((c) => c.bookingId === b.id)?.id ?? ""}`,
      })),
    ...(stats && stats.guests - stats.sent > 0
      ? [{ id: "inv", icon: Mail, text: tn("cabinet.todoInvite", stats.guests - stats.sent), href: `/invitations/${inv!.id}?tab=guests` }]
      : []),
  ];

  const missing = event?.checklist.find((c) => !c.done && c.category)?.category;
  const ideas = missing ? searchPosts(db, { category: missing }, actor).slice(0, 8) : [];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm text-text-secondary">{t("cabinet.hello", { name: user?.name?.split(" ")[0] || t("roles.client") })}</p>
        <h1 className="mt-1 font-serif text-4xl font-normal md:text-5xl">{event ? event.title : t("cabinet.overview")}</h1>
        {event && (
          <p className="mt-2 text-sm text-text-secondary tabular-nums">
            {date(event.date, "d MMMM yyyy")} · {l(CITIES[event.city])} · {tn("common.guests", event.guests)}
            {days >= 0 && <span className="text-primary"> · {tn("dashboard.daysLeft", days)}</span>}
          </p>
        )}
      </header>

      {!event ? (
        <Section title={t("cabinet.events")}>
          <Empty action={<LinkButton href="/dashboard/events">{t("dashboard.newEvent")}</LinkButton>}>{t("dashboard.noEvents")}</Empty>
        </Section>
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi
            label={t("dashboard.booked")}
            value={money(booked)}
            note={event.budget ? `${Math.round((booked / event.budget) * 100)}% ${t("common.of")} ${money(event.budget)}` : undefined}
          />
          <Kpi label={t("cabinet.frozen")} value={money(money_.held)} note={t("cabinet.frozenNote")} tone="primary" />
          <Kpi label={t("dashboard.checklist")} value={`${done} / ${event.checklist.length}`} note={t("cabinet.checklistNote")} />
          <Kpi
            label={t("cabinet.rsvpComing")}
            value={stats ? String(stats.persons) : "—"}
            note={stats ? tn("cabinet.rsvpOf", stats.guests) : t("cabinet.noInvitation")}
            tone="gold"
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Section
          title={t("cabinet.upcoming")}
          action={
            <Link href="/dashboard/bookings" className="text-sm text-primary hover:underline">
              {t("cabinet.all")}
            </Link>
          }
        >
          <ClientBookingList bookings={active.filter((b) => b.date >= today).slice(0, 4)} />
        </Section>

        <Section title={t("cabinet.attention")}>
          {todo.length ? (
            <ul className="flex flex-col gap-1">
              {todo.map((x) => (
                <li key={x.id}>
                  <Link href={x.href} className="group flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-muted">
                    <x.icon className="size-4 shrink-0 text-primary" strokeWidth={1.5} />
                    <span className="flex-1">{x.text}</span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 py-4 text-sm text-text-secondary">
              <Check className="size-4 text-success" /> {t("cabinet.allDone")}
            </p>
          )}
        </Section>
      </div>

      {ideas.length > 0 && missing && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-base font-medium">
              {t("cabinet.ideasFor", { what: l(db.categories.find((c) => c.id === missing)?.name) })}
            </h2>
            <Link href={`/vendors?category=${missing}`} className="text-sm text-primary hover:underline">
              {t("cabinet.all")}
            </Link>
          </div>
          <Masonry className="lg:columns-4 2xl:columns-4">
            {ideas.map((it) => (
              <PostCard key={it.post.id} item={it} onOpen={(id) => router.push(`/vendors?post=${id}&category=${missing}`)} />
            ))}
          </Masonry>
        </section>
      )}
    </div>
  );
}
