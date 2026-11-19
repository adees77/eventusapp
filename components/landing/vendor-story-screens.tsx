"use client";

/**
 * Vendor scroll story (/for-vendors), played as a game like Dona's «seller for a day»: the HUD under the
 * top bar shows the level, six achievements and example earnings that grow scene by scene.
 * The hero is a real motorcade vendor from the catalog (its cover and portfolio photos), so every screen
 * looks like a working vendor account rather than an empty template.
 */
import { BadgeCheck, Bot, CalendarCheck, Check, Clock, Eye, Heart, Images, Inbox, Moon, Search, Star, Trophy, UserRound, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { Monogram } from "@/components/vendor/badges";
import type { Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CountUp, Dots, EASE, Float, PHOTO_CARD, Photo, TypingDots, useDur, usePop, useSteps, useVendor, useVendors, type Side } from "./story-kit";

export type VendorN = 1 | 2 | 3 | 4 | 5 | 6;

/* ─────────────────────────── the game ─────────────────────────── */

const STEP_ICONS = [UserRound, Images, Inbox, Bot, CalendarCheck, Wallet] as const;
const ACH = ["vA1", "vA2", "vA3", "vA4", "vA5", "vA6"] as const;
const PRICE = 48_000; // 3 Gelandewagens for 4 hours
const PREPAY = PRICE * 0.3;
const SEASON = 864_000; // ~18 weddings
/** achievements unlocked and example earnings after each scene */
const UNLOCKED = [0, 1, 3, 4, 6, 6];
const EARNED = [0, 0, 0, 0, PRICE, SEASON];
const levelAt = (scene: number) => 1 + Math.floor(UNLOCKED[scene] / 2);

/** The hero vendor: name, cover and portfolio shots (falls back to a generic name in an empty catalog) */
function useHero() {
  const { t } = useI18n();
  const v = useVendor("cars");
  const photos = [v?.cover, ...(v?.portfolio ?? [])].filter((p): p is string => !!p);
  return { v, name: v?.name ?? t("landing.vProfileName"), photo: (i: number) => photos[i % Math.max(1, photos.length)] };
}

export function VendorHud({ scene, dark }: { scene: number; dark: boolean }) {
  const { t, money } = useI18n();
  const dur = useDur();
  const pill = dark ? "bg-white/10 backdrop-blur-md" : "bg-white/70 backdrop-blur-md";
  const unlocked = UNLOCKED[scene];
  return (
    <div className="container-app flex items-center justify-between gap-3">
      <div className={cn("flex h-9 items-center gap-2 rounded-full pr-3.5 pl-1.5 text-xs md:h-11", pill)}>
        <span className="flex size-6 items-center justify-center rounded-full bg-sun text-sun-foreground md:size-8">
          <UserRound className="size-3.5 md:size-4" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-medium">{t("landing.vHudProfile")}</span>
          <motion.span key={levelAt(scene)} initial={{ opacity: 0, y: dur(4) }} animate={{ opacity: 1, y: 0 }} className="text-[10px] opacity-60">
            {t("landing.vHudLevel", { n: levelAt(scene) })}
          </motion.span>
        </span>
      </div>

      <div className={cn("hidden items-center gap-1.5 rounded-full p-1.5 lg:flex", pill)} aria-hidden>
        {STEP_ICONS.map((Icon, i) => {
          const on = i < unlocked;
          return (
            <motion.span
              key={i}
              animate={{ scale: on ? 1 : 0.86 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors duration-300",
                on ? "bg-sun text-sun-foreground" : "bg-current/10 opacity-50",
              )}
              title={t(`landing.${ACH[i]}`)}
            >
              <Icon className="size-3.5" />
            </motion.span>
          );
        })}
      </div>

      <div className={cn("flex h-9 items-center gap-2 rounded-full pr-3.5 pl-1.5 text-xs md:h-11", pill)}>
        <span className="flex size-6 items-center justify-center rounded-full bg-sun text-sun-foreground md:size-8">
          <Wallet className="size-3.5 md:size-4" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] opacity-60">{t("landing.vHudEarned")}</span>
          <span className="font-medium tabular-nums">
            <CountUp key={scene} from={EARNED[Math.max(0, scene - 1)]} to={EARNED[scene]} delay={0.4} duration={1.1} format={money} />
          </span>
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────── phone screens ─────────────────────────── */

export function VendorScreen({ n }: { n: VendorN }) {
  switch (n) {
    case 1:
      return <CabinetScreen />;
    case 2:
      return <ProfileScreen />;
    case 3:
      return <ClientsScreen />;
    case 4:
      return <ChatScreen />;
    case 5:
      return <MoneyScreen />;
    default:
      return <ResultScreen />;
  }
}

/** Cover photo with the vendor's avatar and name over a dark fade */
function HeroHeader({ v, name, src }: { v?: Vendor; name: string; src?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl text-white">
      <Photo src={src} sizes="260px" className="h-24" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" aria-hidden />
      <div className="absolute inset-x-3 bottom-2.5 flex items-center gap-2">
        <Monogram name={name} className="size-8 rounded-xl text-[10px]" />
        <span className="min-w-0">
          <span className="flex items-center gap-1 truncate text-[13px] font-semibold">
            {name}
            <BadgeCheck className="size-3.5 shrink-0 text-sun" />
          </span>
          {v && (
            <span className="flex items-center gap-1 text-[10px] text-white/75">
              <Star className="size-3 fill-sun text-sun" />
              {v.rating.toFixed(1)}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function CabinetScreen() {
  const { t } = useI18n();
  const pop = usePop();
  const { v, name, photo } = useHero();
  const tiles = [
    [t("landing.vStRequests"), "12"],
    [t("landing.vStBookings"), "5"],
    [t("landing.vStRating"), v ? v.rating.toFixed(1) : "4.9"],
  ];
  const bookings = [
    { day: 14, title: t("landing.vBk1"), paid: true },
    { day: 20, title: t("landing.vBk2"), paid: true },
    { day: 27, title: t("landing.vBk3"), paid: false },
  ];
  return (
    <>
      <motion.div {...pop(0.05, 12)}>
        <HeroHeader v={v} name={name} src={photo(0)} />
      </motion.div>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {tiles.map(([label, value], i) => (
          <motion.div key={label} {...pop(0.2 + i * 0.07, 8)} className="rounded-2xl bg-foreground/[0.045] px-2.5 py-2">
            <div className="display text-lg tabular-nums">{value}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 text-2xs font-medium text-muted-foreground">{t("landing.vUpcoming")}</div>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {bookings.map((b, i) => (
          <motion.div key={b.day} {...pop(0.4 + i * 0.08, 8)} className="flex items-center gap-2.5 rounded-2xl bg-foreground/[0.045] p-2">
            <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-xl bg-white leading-none">
              <span className="text-[13px] font-semibold tabular-nums">{b.day}</span>
              <span className="text-[9px] text-muted-foreground">{t("landing.vMonth")}</span>
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{b.title}</span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                b.paid ? "bg-success/12 text-success" : "bg-foreground/[0.06] text-muted-foreground",
              )}
            >
              {b.paid ? t("landing.vPaid") : t("landing.vAwait")}
            </span>
          </motion.div>
        ))}
      </div>
      <motion.div {...pop(0.8, 10)} className="mt-auto flex items-center gap-2 rounded-2xl bg-ink px-3 py-2.5 text-[12px] text-white">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-sun opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-sun" />
        </span>
        {t("landing.vNewReqBanner")}
      </motion.div>
    </>
  );
}

/** The vendor's profile exactly as a client sees it in the app: works, services with prices, free dates */
function ProfileScreen() {
  const { t, money } = useI18n();
  const pop = usePop();
  const { v, name, photo } = useHero();
  const busy = new Set([13, 15]);
  return (
    <>
      <motion.div {...pop(0.05, 12)}>
        <HeroHeader v={v} name={name} src={photo(0)} />
      </motion.div>
      <div className="mt-2 flex gap-1 text-[11px]">
        {[t("landing.vTabWorks"), t("landing.vTabServices"), t("landing.vTabReviews")].map((x, i) => (
          <span key={x} className={cn("rounded-full px-2.5 py-1", i === 0 ? "bg-ink text-white" : "bg-foreground/[0.05] text-muted-foreground")}>
            {x}
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">
        {[1, 2, 3, 4, 5, 6].map((i, k) => (
          <motion.div key={i} {...pop(0.2 + k * 0.07, 6)}>
            <Photo src={photo(i)} sizes="90px" className="aspect-square rounded-lg" />
          </motion.div>
        ))}
      </div>
      <div className="mt-2.5 text-2xs font-medium text-muted-foreground">{t("landing.vPrices")}</div>
      <div className="mt-1 flex flex-col gap-1">
        {[
          [t("landing.vService1"), PRICE],
          [t("landing.vService2"), 75_000],
        ].map(([label, price], i) => (
          <motion.div key={String(label)} {...pop(0.7 + i * 0.1, 6)} className="flex items-center justify-between rounded-xl bg-foreground/[0.045] px-3 py-1.5 text-[12px]">
            <span>{label}</span>
            <span className="font-medium tabular-nums">{money(Number(price))}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between text-2xs font-medium text-muted-foreground">
        {t("landing.vFreeDates")}
        <Dots free={5} total={7} delay={1} />
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center">
        {[12, 13, 14, 15, 16, 17, 18].map((d) => (
          <span
            key={d}
            className={cn(
              "flex h-7 items-center justify-center rounded-lg text-[11px] tabular-nums",
              busy.has(d) ? "bg-foreground/[0.04] text-muted-foreground line-through" : "bg-primary/10 font-medium text-primary",
            )}
          >
            {d}
          </span>
        ))}
      </div>
    </>
  );
}

/** The EVENTUS feed as a social network: search, categories and a grid of works — only celebrations */
function ClientsScreen() {
  const { t } = useI18n();
  const pop = usePop();
  const all = useVendors();
  const { name, photo } = useHero();
  const others = (["halls", "photo", "decor", "cakes", "hosts"] as const).map((c) => all[c]);
  const tile = (src: string | undefined, label: string, likes: number, i: number, mine?: boolean) => (
    <motion.div key={label + i} {...pop(0.15 + i * 0.08, 10)} className={cn("relative overflow-hidden rounded-xl", mine && "ring-2 ring-sun")}>
      <Photo src={src} sizes="125px" className={i % 3 === 0 ? "h-[128px]" : "h-[96px]"} />
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-ink/80 to-transparent px-1.5 pt-4 pb-1 text-[9px] text-white">
        <span className="truncate font-medium">{label}</span>
        <span className="flex shrink-0 items-center gap-0.5 tabular-nums">
          <Heart className="size-2.5 fill-white" />
          {mine ? <CountUp to={likes} delay={0.6} duration={1.4} /> : likes}
        </span>
      </span>
      {mine && <span className="absolute top-1 left-1 rounded-full bg-sun px-1.5 py-0.5 text-[9px] font-medium text-sun-foreground">{t("landing.vYourPost")}</span>}
    </motion.div>
  );
  return (
    <>
      <div className="flex h-8 items-center gap-2 rounded-full bg-foreground/[0.045] px-3 text-[11px] text-muted-foreground">
        <Search className="size-3.5" />
        <span className="truncate">{t("feed.search")}</span>
      </div>
      <div className="mt-2 flex gap-1 overflow-hidden text-[10px]">
        {[t("landing.vOnlyEvents"), t("landing.storyCapCars"), t("landing.storyCapHalls"), t("landing.storyCapPhoto")].map((c, i) => (
          <span key={c} className={cn("shrink-0 rounded-full px-2 py-0.5", i === 0 ? "bg-ink text-white" : "bg-foreground/[0.05]")}>
            {c}
          </span>
        ))}
      </div>
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-2 gap-1.5 overflow-hidden">
        <div className="flex flex-col gap-1.5">
          {tile(photo(4), name, 248, 0, true)}
          {tile(others[0]?.cover, others[0]?.name ?? "", 131, 1)}
          {tile(others[4]?.cover, others[4]?.name ?? "", 87, 5)}
        </div>
        <div className="flex flex-col gap-1.5">
          {tile(others[1]?.cover, others[1]?.name ?? "", 96, 2)}
          {tile(others[2]?.cover, others[2]?.name ?? "", 174, 3)}
          {tile(others[3]?.cover, others[3]?.name ?? "", 112, 4)}
        </div>
      </div>
      {/* the request lands on top of the feed, like a push */}
      <motion.div {...pop(1.1, -26)} className="relative z-10 -mt-10 rounded-3xl bg-ink p-3 text-white shadow-[0_18px_40px_-16px_rgba(5,4,30,0.6)]">
        <div className="flex items-center gap-2">
          <Monogram name={t("landing.vReqClient")} className="size-8 rounded-full text-[10px]" />
          <span className="min-w-0">
            <span className="block text-[12px] font-medium">
              {t("landing.vNewRequest")} · {t("landing.vReqClient")}
            </span>
            <span className="block truncate text-[10px] text-white/65">{t("landing.vReqEvent")}</span>
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] text-white/70">
            <Bot className="size-3" />
            {t("landing.vReqBy")}
          </span>
          <span className="rounded-full bg-sun px-3 py-1 text-[11px] font-medium text-sun-foreground">{t("landing.vReqReply")}</span>
        </div>
      </motion.div>
    </>
  );
}

function ChatScreen() {
  const { t } = useI18n();
  const pop = usePop();
  const step = useSteps([0.2, 0.75, 1.7, 2.2]); // ask, typing, reply, booking card
  return (
    <>
      <div className="flex items-center gap-2.5 pb-3">
        <Monogram name={t("landing.vReqClient")} className="size-8 rounded-full text-xs" />
        <span className="text-[13px] font-medium">{t("landing.vReqClient")}</span>
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">23:40</span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5">
        {step >= 1 && (
          <motion.div {...pop(0)} className="max-w-[85%] rounded-2xl rounded-bl-md bg-foreground/[0.06] px-3.5 py-2.5 text-[13px] leading-snug">
            {t("landing.vAsk")}
          </motion.div>
        )}
        {step >= 2 && (
          <motion.div {...pop(0)} className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-white">
            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-2xs font-medium">
              <Bot className="size-3" />
              {t("landing.storyAi")}
            </span>
            {step === 2 ? (
              <div className="text-white/70">
                <TypingDots />
              </div>
            ) : (
              <div className="text-[13px] leading-snug">{t("landing.vAiReply")}</div>
            )}
          </motion.div>
        )}
        {step >= 4 && (
          <motion.div {...pop(0, 14)} className="ml-auto flex w-[88%] items-center justify-between rounded-2xl bg-cream p-3">
            <span>
              <span className="block text-xs font-medium">{t("landing.vService1")}</span>
              <span className="block text-2xs text-text-secondary">{t("landing.storyChipDate")}</span>
            </span>
            <span className="rounded-full bg-sun px-3 py-1.5 text-xs font-medium text-sun-foreground">{t("landing.mockBook")}</span>
          </motion.div>
        )}
      </div>
      {/* the vendor sees everything and can step in at any moment */}
      {step >= 4 && (
        <motion.div {...pop(0.5, 10)} className="flex items-center gap-2 rounded-2xl bg-foreground/[0.045] p-2 pl-3 text-[11px] text-text-secondary">
          <Eye className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 leading-snug">{t("landing.vAiNote")}</span>
          <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-[10px] font-medium text-white">{t("landing.vAiTakeOver")}</span>
        </motion.div>
      )}
    </>
  );
}

const DAY = 14;

function MoneyScreen() {
  const { t, money } = useI18n();
  const dur = useDur();
  const pop = usePop();
  const step = useSteps([0.5, 1.1, 1.8]); // prepayment in, date closed, money out
  const week = t("landing.vWeek").split(",");
  const rows = [
    { icon: Wallet, title: t("landing.vM1"), sub: `${money(PREPAY)} · ${t("landing.vM1s")}` },
    { icon: CalendarCheck, title: t("landing.vM2"), sub: t("landing.vM2s") },
    { icon: Check, title: t("landing.vM3"), sub: t("landing.vM3s") },
  ];
  return (
    <>
      <motion.div {...pop(0.05, 12)} className="mb-3 rounded-2xl bg-ink p-3 text-white">
        <div className="flex items-center gap-2">
          <Monogram name={t("landing.vReqClient")} className="size-8 rounded-full text-[10px]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-medium">
              {t("landing.vNewBooking")} · {t("landing.vReqClient")}
            </span>
            <span className="block truncate text-[10px] text-white/65">{t("landing.vService1")}</span>
          </span>
        </div>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-sun px-2.5 py-1 text-[10px] font-medium text-sun-foreground">
          <Check className="size-3" />
          {t("landing.vHot")}
        </span>
      </motion.div>
      {/* one week around the date; it fills when the date closes */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {week.map((d, i) => {
          const day = 11 + i;
          const booked = day === DAY && step >= 2;
          return (
            <span key={d} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{d}</span>
              <motion.span
                animate={booked ? { scale: [1, 1.25, 1] } : undefined}
                transition={{ duration: dur(0.5), ease: EASE }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-xl text-[12px] tabular-nums transition-colors duration-300",
                  booked ? "bg-primary font-semibold text-white" : day === DAY ? "bg-primary/10 text-primary" : "bg-foreground/[0.04]",
                )}
              >
                {day}
              </motion.span>
            </span>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col">
        {rows.map((r, i) => {
          const on = step > i;
          const Icon = r.icon;
          return (
            <div key={r.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <motion.span
                  animate={{ scale: on ? 1 : 0.85 }}
                  transition={{ type: "spring", duration: dur(0.45), bounce: 0.4 }}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-colors duration-300",
                    on ? (i === 2 ? "bg-success text-white" : "bg-primary text-white") : "bg-foreground/10 text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </motion.span>
                {i < rows.length - 1 && (
                  <span className="relative my-1 h-7 w-0.5 overflow-hidden rounded-full bg-foreground/10">
                    <motion.span
                      className="absolute inset-0 origin-top bg-primary"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: step > i + 1 ? 1 : 0 }}
                      transition={{ duration: dur(0.5), ease: EASE }}
                    />
                  </span>
                )}
              </div>
              <span className={cn("flex flex-col pt-1 transition-opacity duration-300", on ? "opacity-100" : "opacity-45")}>
                <span className="text-[13px] font-medium">{r.title}</span>
                <span className="text-[11px] text-muted-foreground">{r.sub}</span>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ResultScreen() {
  const { t, money } = useI18n();
  const pop = usePop();
  const { v, name, photo } = useHero();
  const tiles = [
    [t("landing.vStRequests"), <CountUp key="r" to={42} delay={0.3} duration={1.2} />],
    [t("landing.vStBookings"), <CountUp key="b" to={18} delay={0.35} duration={1.2} />],
    [t("landing.vStRating"), v ? v.rating.toFixed(1) : "4.9"],
    [t("landing.vStEarned"), <CountUp key="e" to={SEASON} delay={0.4} duration={1.4} format={money} />],
  ] as const;
  return (
    <>
      <motion.div {...pop(0.05, 12)} className="relative">
        <Photo src={photo(0)} sizes="260px" className="h-28 rounded-2xl" />
        <span className="absolute -bottom-6 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-gold-soft shadow-lift">
          <BadgeCheck className="size-8 text-gold" strokeWidth={1.6} />
        </span>
      </motion.div>
      <div className="mt-8 flex flex-col items-center gap-0.5 text-center">
        <span className="text-[15px] font-semibold">{name}</span>
        <span className="text-2xs text-gold-foreground">{t("common.verified")}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {tiles.map(([label, value], i) => (
          <motion.div key={label} {...pop(0.25 + i * 0.08, 8)} className={cn("rounded-2xl bg-foreground/[0.045] p-3", i === 3 && "col-span-2 bg-ink text-white")}>
            <div className="display text-xl tabular-nums">{value}</div>
            <div className={cn("text-[10px]", i === 3 ? "text-white/60" : "text-muted-foreground")}>{label}</div>
          </motion.div>
        ))}
      </div>
    </>
  );
}

/* ───────────── floating details around the phone ───────────── */

/** Simplified Instagram / TikTok marks for the «other feeds» comparison (lucide has no brand icons) */
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
    </svg>
  );
}

/** Dona-style achievement toast */
function Achievement({ side, top, out, delay, inner, name }: { side: Side; top: string; out: number; delay: number; inner?: boolean; name: string }) {
  const { t } = useI18n();
  return (
    <Float side={side} inner={inner} top={top} out={out} delay={delay} className="gap-2.5 py-2 pr-4 pl-2">
      <span className="flex size-8 items-center justify-center rounded-full bg-sun text-sun-foreground">
        <Trophy className="size-4" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-normal tracking-wide text-text-secondary uppercase">{t("landing.vAch")}</span>
        <span>{name}</span>
      </span>
    </Float>
  );
}

function CarCard({ src, caption }: { src?: string; caption: string }) {
  return (
    <span className="flex w-[132px] flex-col gap-2">
      <Photo src={src} sizes="132px" className="h-[110px] w-full rounded-[14px]" />
      <span className="truncate px-1 pb-0.5">{caption}</span>
    </span>
  );
}

export function VendorFloats({ n, side }: { n: VendorN; side: Side }) {
  const { t, money } = useI18n();
  const pop = usePop();
  const { photo } = useHero();
  const f = { side };
  switch (n) {
    case 1:
      return (
        <>
          <Float {...f} top="6%" out={-150} delay={0.5} bob={5} className={PHOTO_CARD}>
            <CarCard src={photo(1)} caption={t("landing.storyCapCars")} />
          </Float>
          <Float {...f} inner top="44%" out={-100} delay={0.75} bob={6} className="bg-sun text-sun-foreground">
            +{money(PRICE)}
          </Float>
          <Float {...f} top="62%" out={-140} delay={0.95} bob={5.5} className={PHOTO_CARD}>
            <CarCard src={photo(2)} caption={t("landing.vService1")} />
          </Float>
        </>
      );
    case 2:
      return (
        <>
          <Float {...f} top="8%" out={-104} delay={0.4}>
            <Clock className="size-4 text-primary" />
            {t("landing.vMinutes")}
          </Float>
          <Float {...f} inner top="30%" out={-178} delay={0.7} className="flex-col items-start gap-1.5 py-3">
            {[t("landing.vChk1"), t("landing.vChk2"), t("landing.vChk3"), t("landing.vChk4")].map((c, i) => (
              <motion.span key={c} {...pop(0.9 + i * 0.25, 0)} className="flex items-center gap-2">
                <span className="flex size-4 items-center justify-center rounded-full bg-success text-white">
                  <Check className="size-2.5" />
                </span>
                {c}
              </motion.span>
            ))}
          </Float>
          <Achievement {...f} top="66%" out={-150} delay={2.1} name={t("landing.vA1")} />
        </>
      );
    case 3:
      return (
        <>
          <Float {...f} top="6%" out={-172} delay={0.5} className="flex-col items-start gap-1.5 py-3">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <InstagramGlyph className="size-4" />
              <TikTokGlyph className="size-4" />
              {t("landing.vSocial")}
            </span>
            <span className="font-normal text-muted-foreground line-through">{t("landing.vSocialNoise")}</span>
            <span className="font-normal text-muted-foreground line-through">{t("landing.vSocialAds")}</span>
          </Float>
          <Float {...f} inner top="36%" out={-110} delay={1} className="bg-sun text-sun-foreground">
            {t("landing.vNoAds")}
          </Float>
          <Achievement {...f} top="68%" out={-140} delay={1.6} name={t("landing.vA3")} />
        </>
      );
    case 4:
      return (
        <>
          <Float {...f} top="8%" out={-140} delay={0.4} className="bg-ink text-white">
            <Moon className="size-4 text-sun" />
            {t("landing.vBusy")}
          </Float>
          <Float {...f} inner top="44%" out={-215} delay={2.6}>
            <UserRound className="size-4 text-primary" />
            {t("landing.vStepBack")}
          </Float>
          <Achievement {...f} top="66%" out={-140} delay={2.4} name={t("landing.vA4")} />
        </>
      );
    case 5:
      return (
        <>
          <Float {...f} top="8%" out={-112} delay={0.7} className="bg-sun text-sun-foreground">
            +{money(PREPAY)}
          </Float>
          <Float {...f} inner top="34%" out={-218} delay={1.2} className="flex-col items-start gap-1 py-3">
            <span className="font-normal text-muted-foreground line-through">{t("landing.vNoHaggle")}</span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-success" />
              {t("landing.vHotFloat")}
            </span>
          </Float>
          <Achievement {...f} top="60%" out={-110} delay={2.1} name={t("landing.vA6")} />
          <Float {...f} top="78%" out={-120} delay={2.5}>
            <Star className="size-4 fill-sun text-sun" />
            5.0 · {t("landing.vNewReview")}
          </Float>
        </>
      );
    default:
      return null;
  }
}
