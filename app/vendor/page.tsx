"use client";

import { eachWeekOfInterval, endOfWeek, format, subWeeks } from "date-fns";
import { ArrowRight, Check, Lock, MessageSquareReply, Receipt } from "lucide-react";
import Link from "next/link";
import { BarChart, LineChart } from "@/components/charts/charts";
import { Kpi } from "@/components/layout/cabinet-shell";
import { PageHeader, Section } from "@/components/panel";
import { useMyVendor } from "@/components/vendor-panel/use-my-vendor";
import { VendorCalendar } from "@/components/vendor-panel/calendar";
import { VendorBookingList } from "@/components/vendor-panel/vendor-booking-list";
import { specsProgress } from "@/lib/data/specs";
import { useVendorOverview } from "@/lib/data/views/vendor";
import { useI18n } from "@/lib/i18n";
import { escrowOf } from "@/lib/payments/escrow";
import { routes } from "@/lib/routes";

export default function VendorOverview() {
  const { t, num, money, date, locale } = useI18n();
  const vendor = useMyVendor();
  const { bookings: rows, balance: bal, views, postsCount, likes, ordersDone, unanswered: reviews, activeOffers: offersCount, hasBlocks } =
    useVendorOverview(vendor.id);
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const liveRows = rows.filter((r) => r.booking.status !== "cancelled");
  const live = liveRows.map((r) => r.booking);
  const conversion = views ? (live.length / views) * 100 : 0;

  // gross bookings value per week, last 12 weeks (by creation date)
  const weeks = eachWeekOfInterval({ start: subWeeks(today, 11), end: today }, { weekStartsOn: 1 });
  const weekly = weeks.map((w) => {
    const end = endOfWeek(w, { weekStartsOn: 1 });
    const sum = live.filter((b) => new Date(b.createdAt) >= w && new Date(b.createdAt) <= end).reduce((s, b) => s + b.total, 0);
    return {
      label: format(w, "d.MM"),
      value: sum,
      hint: `${date(format(w, "yyyy-MM-dd"), "d MMM")} — ${date(format(end, "yyyy-MM-dd"), "d MMM")}`,
    };
  });
  // demand by weekday of the event date
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i); // Monday-first
    return {
      label: new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { weekday: "short" }).format(d),
      value: live.filter((b) => (new Date(b.date).getDay() + 6) % 7 === i).length,
    };
  });

  const toConfirm = rows.filter(({ booking: b }) => escrowOf(b).state === "held" && !b.escrow?.vendorConfirmedAt);
  const todo = [
    ...toConfirm.map(({ booking: b, clientName, conversationId }) => ({
      id: b.id,
      icon: Lock,
      text: t("vcab.todoConfirm", { client: clientName, amount: money(escrowOf(b).amount) }),
      href: routes.chat(conversationId ?? ""),
    })),
    ...rows
      .filter(({ booking: b }) => b.status === "pending")
      .map(({ booking: b, clientName }) => ({
        id: `p-${b.id}`,
        icon: Receipt,
        text: t("vcab.todoPending", { client: clientName }),
        href: routes.vendorBookings,
      })),
    ...reviews.map((r) => ({
      id: r.id,
      icon: MessageSquareReply,
      text: t("vcab.todoReview", { author: r.author }),
      href: routes.vendor(vendor.slug, "reviews"),
    })),
  ];

  const setup = [
    {
      done: specsProgress(vendor.category, vendor.specs) >= 0.6,
      text: t("vcab.setupDetails", { p: Math.round(specsProgress(vendor.category, vendor.specs) * 100) }),
      href: routes.vendorDetails,
    },
    { done: offersCount > 0, text: t("vcab.setupOffer"), href: routes.createService },
    { done: postsCount >= 3, text: t("vcab.setupPosts", { n: postsCount }), href: routes.createPost },
    { done: !!vendor.description.ru || !!vendor.description.en, text: t("vcab.setupAbout"), href: routes.vendorProfile },
    {
      done: hasBlocks,
      text: t("vcab.setupCalendar"),
      href: routes.vendorCalendar,
    },
    { done: vendor.verified, text: t("vcab.setupVerify"), href: routes.vendorProfile },
  ];
  const setupLeft = setup.filter((x) => !x.done).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("cabinet.overview")} subtitle={vendor.name} />
      {setupLeft > 0 && live.length === 0 && (
        <Section title={t("vcab.setupTitle", { done: setup.length - setupLeft, total: setup.length })}>
          <div className="mb-4 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${((setup.length - setupLeft) / setup.length) * 100}%` }} />
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {setup.map((x) => (
              <li key={x.text}>
                <Link href={x.href} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted">
                  <span
                    className={
                      x.done
                        ? "flex size-5 items-center justify-center rounded-full bg-success text-white"
                        : "size-5 rounded-full border border-border"
                    }
                  >
                    {x.done && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className={x.done ? "text-muted-foreground line-through decoration-foreground/20" : ""}>{x.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label={t("vcab.available")} value={money(bal.available)} note={t("vcab.availableNote")} />
        <Kpi label={t("cabinet.frozen")} value={money(bal.held)} note={t("vcab.frozenNote")} tone="primary" />
        <Kpi label={t("vp.bookingsCount")} value={num(live.length)} note={t("vcab.conversion", { p: conversion.toFixed(1) })} />
        <Kpi
          label={t("vp.views")}
          value={num(views)}
          note={t("vcab.socialNote", { f: num(ordersDone), l: num(likes) })}
          tone="gold"
        />
      </div>

      {/* availability is the vendor's daily tool: it lives on the overview, not a separate page */}
      <div id="calendar" className="scroll-mt-24">
        <VendorCalendar key={vendor.id} vendor={vendor} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Section title={t("vcab.revenueChart")}>
          <LineChart data={weekly} format={money} height={180} />
        </Section>
        <Section title={t("cabinet.attention")}>
          {todo.length ? (
            <ul className="flex flex-col gap-1">
              {todo.slice(0, 6).map((x) => (
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Section
          title={t("cabinet.upcoming")}
          action={
            <Link href={routes.vendorBookings} className="text-sm text-primary hover:underline">
              {t("cabinet.all")}
            </Link>
          }
        >
          <VendorBookingList rows={liveRows.filter((r) => r.booking.date >= todayIso).slice(0, 5)} />
        </Section>
        <Section title={t("vcab.weekdayChart")}>
          <BarChart data={weekdays} height={140} />
        </Section>
      </div>
    </div>
  );
}
