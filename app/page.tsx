"use client";

import { ArrowRight, Check, Lock, MessageSquareText, Search, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { EscrowSteps } from "@/components/booking/deal-card";
import { Logo } from "@/components/brand/logo";
import { CategoryIcon } from "@/components/category-icon";
import { InvitationThumb } from "@/components/invitation/thumb";
import { LinkButton } from "@/components/ui/link-button";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { searchPosts } from "@/lib/data/feed";
import { useDB } from "@/lib/data/store";
import { LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Landing for visitors without an account. Signed-in users are routed to their home by AppShell. */
export default function Landing() {
  const { t, l, num, money, locale, setLocale, list } = useI18n();
  const db = useDB((d) => d);
  const posts = searchPosts(db, {}, null).slice(0, 9);
  const categories = [...db.categories].sort((a, b) => a.order - b.order);
  const invitation = db.invitations[0];
  const verified = db.vendors.filter((v) => v.verified).length;
  const [faq, setFaq] = useState<number | null>(0);
  const faqs = list("landing.faq");

  return (
    <div className="min-h-dvh bg-background">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="container-app flex h-16 items-center gap-6">
          <Link href="/" aria-label="EVENTUS">
            <Logo />
          </Link>
          <nav className="ml-6 hidden items-center gap-6 text-sm text-text-secondary lg:flex">
            <a href="#how" className="hover:text-foreground">
              {t("landing.navHow")}
            </a>
            <a href="#deal" className="hover:text-foreground">
              {t("landing.navDeal")}
            </a>
            <a href="#invitations" className="hover:text-foreground">
              {t("landing.navInvitations")}
            </a>
            <a href="#vendors" className="hover:text-foreground">
              {t("landing.navVendors")}
            </a>
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
                    "h-8 rounded-md px-2 text-xs uppercase",
                    x === locale ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {x}
                </button>
              ))}
            </div>
            <Link href="/welcome" className="hidden h-9 items-center px-3 text-sm text-text-secondary hover:text-foreground sm:flex">
              {t("landing.signIn")}
            </Link>
            <LinkButton href="/welcome" className="h-9 px-4">
              {t("landing.start")}
            </LinkButton>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="container-app grid items-center gap-12 pt-12 pb-20 md:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pb-28">
        <div className="animate-rise">
          <p className="text-sm text-gold-foreground">{t("landing.kicker")}</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.02] tracking-[-0.015em] [text-wrap:balance] md:text-7xl">
            {t("landing.title")}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">{t("landing.subtitle")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <LinkButton href="/welcome" className="h-12 px-6 text-md">
              {t("landing.ctaClient")}
              <ArrowRight />
            </LinkButton>
            <LinkButton href="/welcome" variant="outline" className="h-12 px-6 text-md">
              {t("landing.ctaVendor")}
            </LinkButton>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-text-secondary">
            {[t("landing.point1"), t("landing.point2"), t("landing.point3")].map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check className="size-4 text-primary" strokeWidth={2} />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* collage: real posts from the feed */}
        <div className="relative">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((col) => (
              <div key={col} className={cn("flex flex-col gap-3", col === 1 && "mt-10", col === 2 && "mt-4")}>
                {posts
                  .filter((_, i) => i % 3 === col)
                  .map((p) => (
                    <div
                      key={p.post.id}
                      className="relative overflow-hidden rounded-2xl bg-muted"
                      style={{ aspectRatio: `1 / ${p.post.ratio}` }}
                    >
                      <Image
                        src={p.post.photos[0]}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 220px, 33vw"
                        className="object-cover"
                        loading={col === 0 ? "eager" : "lazy"}
                      />
                    </div>
                  ))}
              </div>
            ))}
          </div>
          {posts[0] && (
            <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 pr-5 shadow-lift sm:left-8">
              <Monogram name={posts[0].vendor.name} className="size-10 rounded-full text-sm" />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {posts[0].vendor.name}
                  {posts[0].vendor.verified && <VerifiedSeal />}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-success" aria-hidden />
                  {t("landing.freeOnDate")}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* numbers */}
      <section className="border-y border-border bg-card">
        <dl className="container-app grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
          {[
            [num(db.vendors.length), t("landing.sVendors")],
            [num(verified), t("landing.sVerified")],
            [num(db.categories.length), t("landing.sCategories")],
            ["0 %", t("landing.sClientFee")],
          ].map(([v, k]) => (
            <div key={k}>
              <dt className="sr-only">{k}</dt>
              <dd className="font-serif text-4xl md:text-5xl">{v}</dd>
              <p className="mt-1 text-sm text-text-secondary">{k}</p>
            </div>
          ))}
        </dl>
      </section>

      {/* how */}
      <section id="how" className="container-app scroll-mt-20 py-20 md:py-28">
        <SectionTitle kicker={t("landing.howKicker")} title={t("landing.howTitle")} />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: MessageSquareText, title: t("landing.how1"), text: t("landing.how1Text") },
            { icon: Search, title: t("landing.how2"), text: t("landing.how2Text") },
            { icon: Lock, title: t("landing.how3"), text: t("landing.how3Text") },
          ].map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
                  <s.icon className="size-[18px]" strokeWidth={1.5} />
                </span>
                <span className="font-serif text-2xl text-muted-foreground tabular-nums">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-lg font-medium">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{s.text}</p>
            </li>
          ))}
        </ol>
        <ul className="mt-10 flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.id} className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-text-secondary">
              <CategoryIcon id={c.id} className="size-4 text-muted-foreground" />
              {l(c.name)}
            </li>
          ))}
        </ul>
      </section>

      {/* safe deal */}
      <section id="deal" className="scroll-mt-20 bg-[#0F1E36] text-white">
        <div className="container-app grid gap-12 py-20 md:py-28 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm text-gold">{t("landing.dealKicker")}</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">{t("landing.dealTitle")}</h2>
            <p className="mt-5 max-w-lg text-md leading-relaxed text-white/70">{t("landing.dealText")}</p>
            <EscrowSteps className="mt-10 sm:grid-cols-1 [&_div]:!text-white/75 [&_.text-sm]:!text-white [&_li>span]:!border-gold/70 [&_li>span]:!text-gold" />
          </div>
          {/* static deal card */}
          <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-5 text-foreground shadow-[0_24px_60px_rgb(0_0_0/0.35)]">
            <div className="flex items-start gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary">
                <Lock className="size-4" strokeWidth={1.5} />
              </span>
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">{t("escrow.title")}</span>
                  <span className="text-md font-medium tabular-nums">{money(45000)}</span>
                </div>
                <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-text-secondary">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {t("escrow.states.held")}
                </span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-success/30 bg-success/5 px-3 py-2.5">
                <div className="text-2xs text-muted-foreground">{t("escrow.client")}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-success">
                  <Check className="size-3.5" strokeWidth={2.5} />
                  {t("escrow.confirmed")}
                </div>
              </div>
              <div className="rounded-xl border border-border px-3 py-2.5">
                <div className="text-2xs text-muted-foreground">{t("escrow.vendor")}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-text-secondary">
                  <span className="size-1.5 rounded-full bg-gold" />
                  {t("escrow.waiting")}
                </div>
              </div>
            </div>
            <div className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm text-primary-foreground">
              <Check className="size-4" />
              {t("escrow.confirm")}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">{t("escrow.refundPolicy")}</p>
          </div>
        </div>
      </section>

      {/* invitations */}
      <section
        id="invitations"
        className="container-app grid scroll-mt-20 gap-12 py-20 md:py-28 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center"
      >
        <div className="relative mx-auto w-full max-w-[320px]">
          {invitation && <InvitationThumb inv={invitation} className="rotate-[-2deg]" />}
          <div className="absolute -right-6 bottom-10 w-48 rounded-2xl border border-border bg-card p-4 shadow-lift sm:-right-16">
            <div className="text-xs text-muted-foreground">{t("inv.kComing")}</div>
            <div className="mt-1 font-serif text-3xl tabular-nums">86</div>
            <div className="mt-2 flex h-1 overflow-hidden rounded-full bg-muted">
              <span className="w-[64%] bg-success" />
              <span className="w-[8%] bg-destructive/70" />
            </div>
            <div className="mt-2 text-2xs text-muted-foreground">{t("landing.invMock")}</div>
          </div>
        </div>
        <div>
          <SectionTitle kicker={t("landing.invKicker")} title={t("landing.invTitle")} />
          <p className="mt-5 max-w-lg text-md leading-relaxed text-text-secondary">{t("landing.invText")}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {[t("landing.inv1"), t("landing.inv2"), t("landing.inv3"), t("landing.inv4")].map((x) => (
              <li key={x} className="flex gap-3 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={2} />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* vendors */}
      <section id="vendors" className="scroll-mt-20 border-t border-border bg-card">
        <div className="container-app grid gap-12 py-20 md:py-28 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionTitle kicker={t("landing.venKicker")} title={t("landing.venTitle")} />
            <ul className="mt-8 flex flex-col gap-5">
              {[
                [t("landing.ven1"), t("landing.ven1Text")],
                [t("landing.ven2"), t("landing.ven2Text")],
                [t("landing.ven3"), t("landing.ven3Text")],
              ].map(([a, b]) => (
                <li key={a} className="flex gap-4">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.5} />
                  <div>
                    <div className="font-medium">{a}</div>
                    <div className="mt-1 text-sm leading-relaxed text-text-secondary">{b}</div>
                  </div>
                </li>
              ))}
            </ul>
            <LinkButton href="/welcome" className="mt-10 h-11 px-5">
              {t("landing.ctaVendor")}
              <ArrowRight />
            </LinkButton>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              [t("vcab.available"), money(184500), t("vcab.availableNote")],
              [t("cabinet.frozen"), money(62000), t("vcab.frozenNote")],
              [t("vp.bookingsCount"), "28", t("vcab.conversion", { p: "3.4" })],
              [t("profile.followers"), "1 240", t("landing.venMock")],
            ].map(([a, b, c], i) => (
              <div key={a} className={cn("rounded-2xl border border-border bg-background p-5", i === 0 && "col-span-2")}>
                <div className="text-sm text-text-secondary">{a}</div>
                <div className="mt-2 text-2xl font-medium tabular-nums">{b}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* faq */}
      <section className="container-app max-w-3xl py-20 md:py-28">
        <SectionTitle kicker="FAQ" title={t("landing.faqTitle")} center />
        <ul className="mt-10 divide-y divide-border border-y border-border">
          {Array.from({ length: faqs.length / 2 }, (_, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setFaq(faq === i ? null : i)}
                aria-expanded={faq === i}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="text-md font-medium">{faqs[i * 2]}</span>
                <span className={cn("text-xl text-muted-foreground transition-transform", faq === i && "rotate-45")} aria-hidden>
                  +
                </span>
              </button>
              {faq === i && <p className="-mt-1 pb-5 text-sm leading-relaxed text-text-secondary">{faqs[i * 2 + 1]}</p>}
            </li>
          ))}
        </ul>
      </section>

      {/* final cta */}
      <section className="container-app pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground md:py-20">
          <h2 className="mx-auto max-w-2xl font-serif text-4xl leading-tight [text-wrap:balance] md:text-5xl">{t("landing.finalTitle")}</h2>
          <p className="mx-auto mt-4 max-w-lg text-md text-white/75">{t("landing.finalText")}</p>
          <LinkButton
            href="/welcome"
            variant="outline"
            className="mt-8 h-12 border-white/0 bg-white px-6 text-md text-primary hover:bg-white/90"
          >
            {t("landing.start")}
            <ArrowRight />
          </LinkButton>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container-app flex flex-col gap-4 py-8 text-sm text-text-secondary md:flex-row md:items-center md:justify-between">
          <Logo />
          <span>{t("landing.footer")}</span>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ kicker, title, center }: { kicker: string; title: string; center?: boolean }) {
  return (
    <div className={cn(center && "text-center")}>
      <p className="text-sm text-gold-foreground">{kicker}</p>
      <h2 className="mt-3 font-serif text-4xl leading-tight [text-wrap:balance] md:text-5xl">{title}</h2>
    </div>
  );
}
