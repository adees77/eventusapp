"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarCheck,
  Check,
  Lock,
  Mail,
  Menu,
  Mic,
  Plus,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo, LogoMark } from "@/components/brand/logo";
import { CategoryIcon } from "@/components/category-icon";
import { InvitationThumb } from "@/components/invitation/thumb";
import { LinkButton } from "@/components/ui/link-button";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { getVendorAvailability } from "@/lib/data/availability";
import { activeOffers, minPrice } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import type { CategoryId, DB } from "@/lib/data/types";
import { LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Landing for visitors without an account. Signed-in users are routed to their home by AppShell. */
export default function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <Hero />
      <CategoryStrip />
      <AnyDevice />
      <Bento />
      <Deal />
      <Packages />
      <Reviews />
      <Faq />
      <Footer />
    </div>
  );
}

/* ───────────────────────── hero ───────────────────────── */

function Hero() {
  const { t, num } = useI18n();
  const db = useDB((d) => d);
  const verified = db.vendors.filter((v) => v.verified && !v.hidden).length;
  const rated = db.vendors.filter((v) => v.reviewsCount > 0);
  const avg = rated.length ? rated.reduce((s, v) => s + v.rating, 0) / rated.length : 4.9;

  return (
    <section className="p-2 md:p-3">
      <div className="surface-ink relative overflow-hidden rounded-[28px] md:rounded-[36px]">
        <TopNav />
        <div className="container-app relative flex flex-col items-center pt-12 text-center md:pt-20">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 backdrop-blur">{t("landing.kicker")}</span>
          <h1 className="display mt-6 max-w-5xl text-[38px] md:text-6xl lg:text-[68px]">
            {t("landing.titleA")}
            <br />
            <span className="text-white/60">{t("landing.titleB")}</span>
          </h1>
          <p className="mt-5 max-w-xl text-md leading-relaxed text-white/65 md:text-lg">{t("landing.heroText")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href="/welcome" variant="sun" className="h-12 px-6 text-md">
              {t("landing.ctaClient")}
              <ArrowRight />
            </LinkButton>
            <LinkButton href="/welcome?as=vendor" className="h-12 bg-white/10 px-6 text-md text-white hover:bg-white/15">
              {t("landing.ctaVendor")}
            </LinkButton>
          </div>

          <div className="relative mt-14 w-full max-w-[560px] md:mt-16">
            <div className="absolute -inset-x-16 -top-10 bottom-0 rounded-full bg-primary/40 blur-3xl" aria-hidden />
            <HeroChat />
          </div>
        </div>

        {/* bottom corners, like the reference */}
        <div className="container-app relative -mt-2 grid grid-cols-2 gap-4 pt-6 pb-6 text-left md:absolute md:inset-x-0 md:bottom-0 md:pb-8">
          <div>
            <div className="flex items-center gap-1.5 text-2xl font-medium tabular-nums">
              <Star className="size-5 fill-sun text-sun" />
              {avg.toFixed(1)}
            </div>
            <p className="mt-1 text-xs text-white/55">{t("landing.ratingNote")}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-medium tabular-nums">{num(verified)}</div>
            <p className="mt-1 text-xs text-white/55">{t("landing.verifiedNote")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TopNav() {
  const { t, locale, setLocale } = useI18n();
  return (
    <header className="container-app relative z-10 flex h-16 items-center gap-6 md:h-20">
      <Link href="/" aria-label="EVENTUS" className="[&_*]:!text-white">
        <Logo className="text-white" />
      </Link>
      <nav className="ml-4 hidden items-center gap-1 text-sm text-white/65 lg:flex">
        {[
          ["#bento", t("landing.navHow")],
          ["#deal", t("landing.navDeal")],
          ["#packages", t("landing.pkgTitle")],
          ["#faq", "FAQ"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="whitespace-nowrap rounded-full px-3 py-1.5 transition-colors hover:bg-white/10 hover:text-white">
            {label}
          </a>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden gap-0.5 sm:flex">
          {LOCALES.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setLocale(x)}
              aria-pressed={x === locale}
              className={cn(
                "h-8 rounded-full px-2.5 text-xs uppercase",
                x === locale ? "bg-white/15 text-white" : "text-white/55 hover:text-white",
              )}
            >
              {x}
            </button>
          ))}
        </div>
        <Link href="/welcome" className="hidden h-9 items-center px-3 text-sm text-white/70 hover:text-white sm:flex">
          {t("landing.signIn")}
        </Link>
        <LinkButton href="/welcome" variant="sun" className="h-9 px-4">
          {t("landing.start")}
        </LinkButton>
        <a href="#faq" className="flex size-9 items-center justify-center rounded-full bg-white/10 lg:hidden" aria-label="menu">
          <Menu className="size-4" />
        </a>
      </div>
    </header>
  );
}

/** A short, real-looking exchange with the assistant (vendors and prices come from the catalog) */
function HeroChat() {
  const { t, money } = useI18n();
  const db = useDB((d) => d);
  const pick = (cat: string) => db.vendors.find((v) => v.category === cat && v.verified && !v.hidden);
  const rows = [pick("halls"), pick("cars"), pick("hosts")].filter(Boolean) as NonNullable<ReturnType<typeof pick>>[];
  return (
    <div className="relative rounded-t-[28px] bg-white p-4 text-left text-foreground shadow-[0_-12px_60px_rgb(42_95_165/0.35)] sm:p-5 md:pb-24">
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
          {t("landing.chatUser")}
        </p>
      </div>
      <div className="mt-4 flex gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary">
          <LogoMark className="h-2.5 w-auto" />
        </span>
        <div className="min-w-0 flex-1 text-sm leading-relaxed">
          <p>{t("landing.chatBot")}</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {rows.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-2xl bg-cream/70 px-3 py-2.5">
                <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {v.cover && <Image src={v.cover} alt="" fill sizes="40px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-[13px] font-medium">
                    {v.name}
                    {v.verified && <VerifiedSeal className="[&_svg]:size-3.5" />}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-success" aria-hidden />
                    {t("landing.freeChat")}
                  </span>
                </span>
                <span className="shrink-0 text-xs whitespace-nowrap tabular-nums">
                  {t("feed.fromPrice", { amount: money(minPrice(activeOffers(db, v.id))) })}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-text-secondary">{t("landing.chatBot2")}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-full bg-foreground/[0.05] p-1.5 pl-2">
        <span className="flex size-9 items-center justify-center rounded-full text-text-secondary">
          <Mic className="size-[18px]" strokeWidth={1.75} />
        </span>
        <span className="flex-1 truncate text-sm text-muted-foreground">{t("landing.chatPlaceholder")}</span>
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ArrowUp className="size-4" />
        </span>
      </div>
    </div>
  );
}

/* ───────────────────────── categories ───────────────────────── */

function CategoryStrip() {
  const { l } = useI18n();
  const categories = useDB((d) => d.categories);
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  return (
    <section className="no-scrollbar overflow-x-auto">
      <ul className="container-app flex min-w-max items-center justify-between gap-8 py-8 md:py-10">
        {sorted.map((c) => (
          <li key={c.id} className="flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground">
            <CategoryIcon id={c.id} className="size-[18px]" />
            {l(c.name)}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────────────────── any device ───────────────────────── */

function AnyDevice() {
  const { t, num, money } = useI18n();
  const db = useDB((d) => d);
  const vendor = db.vendors.find((v) => v.category === "cars" && v.verified && !v.hidden) ?? db.vendors[0];
  const offers = vendor ? activeOffers(db, vendor.id) : [];
  const date = nextJune14();
  const a = vendor ? getVendorAvailability(db, vendor.id, date) : { free: 0, total: 0 };
  const authors = db.reviews.slice(0, 3).map((r) => r.author);

  return (
    <section className="container-app grid grid-cols-1 gap-10 py-14 md:py-24 lg:grid-cols-[1fr_1.1fr_0.8fr] lg:items-start">
      <div>
        <h2 className="display text-[32px] md:text-[44px]">{t("landing.anyTitle")}</h2>
        <div className="mt-10 flex flex-col gap-6 lg:mt-24">
          <div>
            <div className="text-sm font-medium">{t("landing.trustLabel")}</div>
            <div className="mt-1.5 flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-4 fill-sun text-sun" />
              ))}
              <span className="ml-2 text-xs text-muted-foreground tabular-nums">4.9 · {num(db.reviews.length)}</span>
            </div>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-full bg-card p-1.5 pr-5 shadow-soft">
            <span className="flex -space-x-2">
              {authors.map((n) => (
                <Monogram key={n} name={n} className="size-9 ring-2 ring-card" />
              ))}
            </span>
            <span>
              <span className="block text-md font-medium tabular-nums">{num(1289)}</span>
              <span className="block text-2xs text-muted-foreground">{t("landing.eventsDone")}</span>
            </span>
          </div>
        </div>
      </div>

      {/* dark card with a booking mockup */}
      <div className="surface-ink relative flex min-h-[340px] items-end rounded-[32px] p-5 md:min-h-[400px] md:p-7">
        {vendor?.cover && (
          <Image src={vendor.cover} alt="" fill sizes="(min-width:1024px) 480px, 100vw" className="rounded-[32px] object-cover opacity-45" />
        )}
        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-t from-ink via-ink/40 to-transparent" aria-hidden />
        {vendor && (
          <div className="relative w-full rounded-3xl bg-white p-4 text-foreground">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {vendor.name}
              {vendor.verified && <VerifiedSeal className="[&_svg]:size-3.5" />}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("feed.fromPrice", { amount: money(minPrice(offers)) })}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <span className="inline-flex gap-[3px]" aria-hidden>
                  {Array.from({ length: Math.min(a.total, 10) }, (_, i) => (
                    <span key={i} className={cn("size-2 rounded-full", i < a.free ? "bg-primary" : "bg-foreground/15")} />
                  ))}
                </span>
                {t("landing.mockFree", { free: a.free, total: a.total })}
              </span>
              <span className="rounded-full bg-sun px-3.5 py-1.5 text-xs font-medium text-sun-foreground">{t("landing.mockBook")}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-8 lg:pt-2">
        <p className="text-sm leading-relaxed text-text-secondary">{t("landing.anyText")}</p>
        <div className="w-full max-w-[260px] rounded-3xl bg-card p-5 shadow-lift lg:-ml-16 lg:mt-20">
          <div className="display text-4xl">{t("landing.fasterValue")}</div>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">{t("landing.fasterText")}</p>
          <LinkButton href="/welcome" variant="sun" className="mt-4 h-8 px-4 text-xs">
            {t("landing.fasterCta")}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── bento ───────────────────────── */

function Bento() {
  const { t } = useI18n();
  const invitation = useDB((d) => d.invitations[0]);
  const bars = [38, 62, 48, 80, 100, 70, 56, 88, 44];

  return (
    <section id="bento" className="container-app scroll-mt-6 py-14 md:py-20">
      <Heading title={t("landing.bentoTitle")} text={t("landing.bentoText")} />
      <div className="mt-10 grid gap-3 md:grid-cols-6 md:gap-4">
        <Tile className="md:col-span-2" title={t("landing.b1")} text={t("landing.b1Text")}>
          <div className="flex h-28 items-end gap-1.5">
            {bars.map((h, i) => (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={cn("flex-1 rounded-full", i === 4 ? "bg-sun" : i % 3 === 0 ? "bg-primary/25" : "bg-primary")}
              />
            ))}
          </div>
        </Tile>

        <Tile className="md:col-span-2" title={t("landing.b2")} text={t("landing.b2Text")}>
          <ol className="flex flex-col gap-2.5">
            {[t("landing.stPaid"), t("landing.stHeld"), t("landing.stDone")].map((s, i) => (
              <li key={s} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full",
                    i < 2 ? "bg-primary text-primary-foreground" : "bg-sun text-sun-foreground",
                  )}
                >
                  {i < 2 ? <Check className="size-3.5" strokeWidth={2.5} /> : <Lock className="size-3" />}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </Tile>

        <Tile className="md:col-span-2" title={t("landing.b3")} text={t("landing.b3Text")}>
          <div className="flex h-28 items-end justify-between gap-3">
            <div className="w-20 -rotate-3">{invitation && <InvitationThumb inv={invitation} />}</div>
            <div className="mb-1 rounded-2xl bg-card px-3 py-2 shadow-soft">
              <div className="display text-2xl tabular-nums">86</div>
              <div className="mt-1 flex h-1 w-20 overflow-hidden rounded-full bg-muted">
                <span className="w-[64%] bg-primary" />
                <span className="w-[10%] bg-sun" />
              </div>
              <div className="mt-1 text-2xs text-muted-foreground">{t("landing.invMock")}</div>
            </div>
          </div>
        </Tile>

        <Tile className="md:col-span-3" title={t("landing.b4")} text={t("landing.b4Text")}>
          <div className="flex h-24 items-center justify-center gap-[3px]">
            {Array.from({ length: 36 }, (_, i) => {
              const h = 14 + Math.abs(Math.sin(i * 0.7)) * 56;
              return i === 18 ? (
                <span key={i} className="mx-3 flex size-14 shrink-0 items-center justify-center rounded-full bg-sun text-sun-foreground shadow-[0_0_0_10px_rgb(242_201_76/0.25)]">
                  <Mic className="size-5" />
                </span>
              ) : (
                <span key={i} style={{ height: h }} className="w-[3px] shrink-0 rounded-full bg-primary/35" />
              );
            })}
          </div>
        </Tile>

        <Tile className="md:col-span-3" title={t("landing.b5")} text={t("landing.b5Text")}>
          <svg viewBox="0 0 400 90" className="h-24 w-full text-primary" fill="none" aria-hidden>
            <path
              d="M0 60 C 30 60, 40 20, 70 22 S 110 75, 140 70 S 180 25, 210 30 S 250 80, 280 66 S 320 18, 350 28 S 385 55, 400 50"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="210" cy="30" r="7" fill="var(--sun)" />
            <circle cx="70" cy="22" r="4" fill="currentColor" />
            <circle cx="350" cy="28" r="4" fill="currentColor" />
          </svg>
        </Tile>
      </div>
    </section>
  );
}

function Tile({
  title,
  text,
  className,
  children,
}: {
  title: string;
  text: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col justify-between gap-6 rounded-[28px] bg-cream p-5 md:p-6", className)}>
      <div>
        <h3 className="text-lg leading-snug font-medium tracking-[-0.01em]">{title}</h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-text-secondary">{text}</p>
      </div>
      {children}
    </div>
  );
}

/* ───────────────────────── safe deal ───────────────────────── */

function Deal() {
  const { t, money } = useI18n();
  return (
    <section id="deal" className="container-app scroll-mt-6 py-6 md:py-10">
      <div className="grid grid-cols-1 items-center gap-10 rounded-[36px] bg-cream p-6 md:p-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="display text-[32px] md:text-[44px]">{t("landing.dealTitle")}</h2>
          <p className="mt-5 max-w-lg text-md leading-relaxed text-text-secondary">{t("landing.dealText")}</p>
          <LinkButton href="/welcome" variant="sun" className="mt-8 h-11 px-5">
            {t("landing.dealCta")}
            <ArrowRight />
          </LinkButton>
        </div>

        <div className="surface-ink relative overflow-hidden rounded-[32px] p-5 md:p-8">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-white/10 shadow-[0_0_60px_rgb(42_95_165/0.6)] md:size-24">
            <Lock className="size-9 text-sun" strokeWidth={1.25} />
          </div>
          <div className="rounded-3xl bg-white p-5 text-foreground">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">{t("escrow.title")}</span>
              <span className="text-md font-medium tabular-nums">{money(45000)}</span>
            </div>
            <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="size-1.5 rounded-full bg-primary" />
              {t("escrow.states.held")}
            </span>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-success/10 px-3 py-2.5">
                <div className="text-2xs text-muted-foreground">{t("escrow.client")}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-success">
                  <Check className="size-3.5" strokeWidth={2.5} />
                  {t("escrow.confirmed")}
                </div>
              </div>
              <div className="rounded-2xl bg-cream px-3 py-2.5">
                <div className="text-2xs text-muted-foreground">{t("escrow.vendor")}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-text-secondary">
                  <span className="size-1.5 rounded-full bg-sun" />
                  {t("escrow.waiting")}
                </div>
              </div>
            </div>
            <div className="mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm text-primary-foreground">
              <Check className="size-4" />
              {t("escrow.confirm")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── packages ───────────────────────── */

type Pkg = { key: "toy" | "wedding" | "jubilee"; cats: CategoryId[]; cars: number; guests: number };
const PACKAGES: Pkg[] = [
  { key: "toy", cats: ["halls", "hosts", "music", "photo", "decor", "cakes"], cars: 3, guests: 150 },
  { key: "wedding", cats: ["halls", "hosts", "photo", "decor", "music", "beauty", "cakes"], cars: 5, guests: 300 },
  { key: "jubilee", cats: ["halls", "hosts", "music", "cakes", "photo"], cars: 0, guests: 80 },
];

/** Typical price of a category: median of each vendor's cheapest fitting offer (halls must seat the guests) */
function typicalPrice(db: DB, cat: CategoryId, guests = 0) {
  const prices = db.vendors
    .filter((v) => v.category === cat && !v.hidden)
    .map((v) => minPrice(activeOffers(db, v.id).filter((o) => !o.capacity || o.capacity >= guests)))
    .filter((p) => Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);
  return prices.length ? prices[Math.floor(prices.length / 2)] : 0;
}

function Packages() {
  const { t, l, money } = useI18n();
  const db = useDB((d) => d);
  const catName = (id: CategoryId) => {
    const c = db.categories.find((x) => x.id === id);
    return c ? l(c.name) : id;
  };
  const budgets = useMemo(
    () =>
      PACKAGES.map((p) => {
        const sum = p.cats.reduce((s, c) => s + typicalPrice(db, c, p.guests), 0) + typicalPrice(db, "cars") * p.cars;
        return Math.round(sum / 10000) * 10000;
      }),
    [db],
  );

  return (
    <section id="packages" className="container-app scroll-mt-6 py-14 md:py-24">
      <Heading title={t("landing.pkgTitle")} text={t("landing.pkgText")} />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PACKAGES.map((p, i) => {
          const hot = i === 1;
          return (
            <div key={p.key} className={cn("surface-ink flex flex-col rounded-[28px] p-6", hot && "md:-translate-y-3")}>
              <div className="flex flex-col items-center text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-white/10">
                  <CalendarCheck className="size-[18px] text-white/80" strokeWidth={1.5} />
                </span>
                <span
                  className={cn(
                    "mt-4 rounded-full px-3 py-1 text-xs",
                    hot ? "bg-sun text-sun-foreground" : "bg-white/10 text-white/75",
                  )}
                >
                  {hot ? t("landing.pkgPopular") : t(`landing.pkg.${p.key}Guests`)}
                </span>
                <div className="mt-4 text-sm text-white/60">
                  {t(`landing.pkg.${p.key}`)}
                  {hot && ` · ${t(`landing.pkg.${p.key}Guests`)}`}
                </div>
                <div className="display mt-1 text-[34px] tabular-nums">
                  <span className="mr-1.5 text-base text-white/50">{t("landing.pkgFrom")}</span>
                  {money(budgets[i])}
                </div>
              </div>
              <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm text-white/80">
                {p.cats.map((c) => (
                  <li key={c} className="flex items-center gap-2.5">
                    <span className="flex size-4 items-center justify-center rounded-full bg-white/90">
                      <Check className="size-2.5 text-ink" strokeWidth={3} />
                    </span>
                    {catName(c)}
                  </li>
                ))}
                {p.cars > 0 && (
                  <li className="flex items-center gap-2.5">
                    <span className="flex size-4 items-center justify-center rounded-full bg-white/90">
                      <Check className="size-2.5 text-ink" strokeWidth={3} />
                    </span>
                    {t("landing.pkg.cars", { n: p.cars })}
                  </li>
                )}
              </ul>
              <LinkButton
                href={`/assistant?q=${encodeURIComponent(t(`landing.pkg.${p.key}Q`))}`}
                variant={hot ? "sun" : "default"}
                className={cn("mx-auto mt-7 h-10 px-5", !hot && "bg-white/10 text-white hover:bg-white/15")}
              >
                {t("landing.pkgCta")}
                <ArrowRight />
              </LinkButton>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────────── reviews ───────────────────────── */

function Reviews() {
  const { t, l } = useI18n();
  const db = useDB((d) => d);
  const reviews = db.reviews.filter((r) => !r.hidden && r.rating >= 5 && l(r.text).length > 40).slice(0, 9);
  const [i, setI] = useState(0);
  if (reviews.length < 3) return null;
  const at = (k: number) => reviews[(i + k + reviews.length) % reviews.length];
  const vendorName = (id: string) => db.vendors.find((v) => v.id === id)?.name ?? "";

  return (
    <section className="overflow-hidden py-14 md:py-24">
      <div className="container-app text-center">
        <h2 className="display mx-auto max-w-2xl text-[32px] md:text-[44px]">{t("landing.reviewsTitle")}</h2>
        <p className="mt-3 text-sm text-text-secondary">{t("landing.reviewsNote")}</p>
      </div>
      <div className="container-app mt-12 grid grid-cols-1 items-center gap-4 md:grid-cols-3 md:gap-0">
        {[-1, 0, 1].map((k) => {
          const r = at(k);
          const center = k === 0;
          return (
            <figure
              key={`${r.id}-${k}`}
              className={cn(
                "animate-rise rounded-[28px] p-6 text-center md:p-8",
                center
                  ? "z-10 bg-sun text-sun-foreground md:scale-105"
                  : cn("hidden bg-card shadow-lift md:block", k < 0 ? "md:translate-x-4 md:-rotate-6" : "md:-translate-x-4 md:rotate-6"),
              )}
            >
              <Monogram name={r.author} className={cn("mx-auto size-12", center && "bg-white/60")} />
              <figcaption className="mt-3">
                <div className="font-medium">{r.author}</div>
                <div className={cn("text-xs", center ? "text-sun-foreground/70" : "text-muted-foreground")}>{vendorName(r.vendorId)}</div>
              </figcaption>
              <div className="mt-3 flex justify-center gap-0.5">
                {Array.from({ length: 5 }, (_, s) => (
                  <Star key={s} className={cn("size-4", center ? "fill-sun-foreground text-sun-foreground" : "fill-sun text-sun")} />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed">«{l(r.text)}»</blockquote>
            </figure>
          );
        })}
      </div>
      <div className="mt-10 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setI(i - 1)}
          aria-label={t("landing.prev")}
          className="flex size-10 items-center justify-center rounded-full bg-card shadow-soft hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setI(i + 1)}
          aria-label={t("landing.next")}
          className="flex size-10 items-center justify-center rounded-full bg-sun text-sun-foreground hover:brightness-95"
        >
          <ArrowRight className="size-4" />
        </button>
      </div>
    </section>
  );
}

/* ───────────────────────── faq ───────────────────────── */

function Faq() {
  const { t, list } = useI18n();
  const faqs = list("landing.faq");
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="container-app max-w-4xl scroll-mt-6 py-14 md:py-20">
      <h2 className="display text-center text-[32px] md:text-[44px]">{t("landing.faqTitle")}</h2>
      <ul className="mt-10 flex flex-col gap-1.5">
        {Array.from({ length: faqs.length / 2 }, (_, i) => {
          const on = open === i;
          return (
            <li key={i} className={cn("rounded-3xl transition-colors", on ? "bg-card" : "hover:bg-card/60")}>
              <button
                type="button"
                onClick={() => setOpen(on ? null : i)}
                aria-expanded={on}
                className="flex w-full items-center gap-4 px-5 py-5 text-left md:gap-10 md:px-6"
              >
                <span className="w-6 shrink-0 text-sm text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-md font-medium">{faqs[i * 2]}</span>
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full bg-sun text-sun-foreground transition-transform",
                    on && "rotate-45",
                  )}
                  aria-hidden
                >
                  <Plus className="size-4" />
                </span>
              </button>
              {on && (
                <p className="-mt-2 pr-16 pb-5 pl-[60px] text-sm leading-relaxed text-text-secondary md:pl-[88px]">{faqs[i * 2 + 1]}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ───────────────────────── footer ───────────────────────── */

function Footer() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  return (
    <footer className="p-2 md:p-3">
      <div className="surface-ink overflow-hidden rounded-[28px] md:rounded-[36px]">
        <div className="container-app pt-12 md:pt-16">
          <div
            className="display bg-gradient-to-b from-white/35 to-white/0 bg-clip-text text-center text-[22vw] leading-[0.8] font-medium tracking-[-0.06em] text-transparent select-none xl:text-[260px]"
            aria-hidden
          >
            EVENTUS
          </div>
        </div>
        <div className="container-app grid grid-cols-1 gap-10 py-12 md:grid-cols-[1.2fr_1fr_1.3fr]">
          <div className="flex flex-col gap-4">
            <Logo className="text-white [&_*]:!text-white" />
            <p className="max-w-xs text-sm text-white/55">{t("landing.finalText")}</p>
          </div>
          <div>
            <div className="text-sm font-medium">{t("landing.footNav")}</div>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-white/60">
              {[
                ["#bento", t("landing.navHow")],
                ["#deal", t("landing.navDeal")],
                ["#packages", t("landing.pkgTitle")],
                ["/welcome?as=vendor", t("landing.navVendors")],
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium">{t("landing.footSub")}</div>
            <p className="mt-2 text-sm text-white/55">{t("landing.footSubText")}</p>
            <form
              className="mt-4 flex items-center gap-1 rounded-full bg-white/10 p-1 pl-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.trim()) return;
                setEmail("");
                toast.success(t("landing.footSubDone"));
              }}
            >
              <Mail className="size-4 shrink-0 text-white/50" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("landing.footEmail")}
                className="h-9 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
              <button type="submit" className="h-9 shrink-0 rounded-full bg-sun px-4 text-sm font-medium text-sun-foreground hover:brightness-95">
                {t("landing.footSubBtn")}
              </button>
            </form>
          </div>
        </div>
        <div className="container-app flex flex-col gap-3 pb-8 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <span>{t("landing.footer")}</span>
          <span className="flex gap-5">
            <span>{t("landing.footPrivacy")}</span>
            <span>{t("landing.footTerms")}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function Heading({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr] md:items-end md:gap-16">
      <h2 className="display text-[32px] md:text-[44px]">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-text-secondary md:justify-self-end">{text}</p>
    </div>
  );
}

/** The demo's showcase date (matches the hero chat: «14 июня») */
function nextJune14() {
  const now = new Date();
  const y = now.getMonth() > 5 || (now.getMonth() === 5 && now.getDate() > 14) ? now.getFullYear() + 1 : now.getFullYear();
  return `${y}-06-14`;
}
