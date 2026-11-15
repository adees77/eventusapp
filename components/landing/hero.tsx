"use client";

/** Landing hero: top nav, headline, CTAs and the chat mock */
import { ArrowRight, ArrowUp, Menu, Mic, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Logo, LogoMark } from "@/components/brand/logo";
import { TryDemoButton } from "@/components/demo/try-demo-button";
import { LinkButton } from "@/components/ui/link-button";
import { VerifiedSeal } from "@/components/vendor/badges";
import { useLandingStats, useShowcase } from "@/lib/data/views/landing";
import type { CategoryId } from "@/lib/data/types";
import { LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

export function Hero() {
  const { t, num } = useI18n();
  const { verified, avgRating: avg } = useLandingStats();

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
            <LinkButton href={routes.welcome} variant="sun" className="h-12 px-6 text-md">
              {t("landing.ctaClient")}
              <ArrowRight />
            </LinkButton>
            <LinkButton href={routes.welcomeVendor} className="h-12 bg-white/10 px-6 text-md text-white hover:bg-white/15">
              {t("landing.ctaVendor")}
            </LinkButton>
          </div>
          <TryDemoButton className="mt-4 text-white/60 hover:text-white" />

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
        <Link href={routes.welcome} className="hidden h-9 items-center px-3 text-sm text-white/70 hover:text-white sm:flex">
          {t("landing.signIn")}
        </Link>
        <LinkButton href={routes.welcome} variant="sun" className="h-9 px-4">
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
const SHOWCASE: CategoryId[] = ["halls", "cars", "hosts"];

function HeroChat() {
  const { t, money } = useI18n();
  const rows = useShowcase(SHOWCASE);
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
            {rows.map(({ vendor: v, priceFrom }) => (
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
                  {t("feed.fromPrice", { amount: money(priceFrom) })}
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
