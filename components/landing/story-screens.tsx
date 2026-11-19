"use client";

/**
 * Client scroll story (/): what the phone shows in each scene and the details floating around it.
 * Real vendors (cover, name, rating) come from the catalog via the Story context; the rest is a mock.
 * Motion: transform + opacity only; small in-screen sequences are timed from mount (useSteps);
 * reduced motion shows every end state at once.
 */
import { BadgeCheck, Bot, Check, Mic, MessageCircle, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { LogoMark } from "@/components/brand/logo";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { InstallFloat, InstallScreen } from "./install-demo";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  CountUp,
  Cover,
  Dots,
  EASE,
  Float,
  InputBar,
  PHOTO_CARD,
  PhotoCard,
  TypingDots,
  typingEnd,
  useDur,
  usePop,
  useReduce,
  useSteps,
  useTyped,
  useVendor,
  useVendors,
  type Side,
} from "./story-kit";

export type ClientN = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/* ─────────────────────────── phone screens ─────────────────────────── */

export function ClientScreen({ n }: { n: ClientN }) {
  switch (n) {
    case 1:
      return <HomeScreen />;
    case 2:
      return <ChatsScreen />;
    case 3:
      return <AskScreen />;
    case 4:
      return <BudgetScreen />;
    case 5:
      return <FeedScreen />;
    case 6:
      return <InboxScreen />;
    case 7:
      return <EscrowScreen />;
    case 8:
      return <InviteScreen />;
    default:
      return <InstallScreen />;
  }
}

function HomeScreen() {
  const { t } = useI18n();
  const pop = usePop();
  const reduce = useReduce();
  const hints = [t("landing.storyHomeHint1"), t("landing.storyHomeHint2"), t("landing.storyHomeHint3")];
  return (
    <>
      <div className="flex items-center gap-2 text-sm font-medium">
        <LogoMark className="h-3.5 w-auto" />
        EVENTUS AI
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <motion.h4 {...pop(0.2, 12)} className="display text-[22px] leading-tight">
          {t("landing.storyHomeTitle")}
        </motion.h4>
        <span className="relative flex size-20 items-center justify-center">
          {!reduce &&
            [0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full bg-primary/20"
                animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: i * 1.1, ease: "easeOut" }}
              />
            ))}
          <span className="relative flex size-16 items-center justify-center rounded-full bg-primary text-white shadow-lift">
            <Mic className="size-6" />
          </span>
        </span>
        <div className="flex flex-wrap justify-center gap-1.5">
          {hints.map((h, i) => (
            <motion.span key={h} {...pop(0.5 + i * 0.1, 8)} className="rounded-full bg-foreground/[0.05] px-3 py-1.5 text-2xs">
              {h}
            </motion.span>
          ))}
        </div>
      </div>
      <InputBar />
    </>
  );
}

function ChatsScreen() {
  const { t } = useI18n();
  const pop = usePop();
  const rows = [
    { name: t("landing.storyChat1"), msg: t("landing.storyChat1m"), n: 4, time: "21:40" },
    { name: t("landing.storyChat2"), msg: t("landing.storyChat2m"), n: 7, time: "21:12" },
    { name: t("landing.storyChat3"), msg: t("landing.storyChat3m"), n: 2, time: "20:55" },
    { name: t("landing.storyChat4"), msg: t("landing.storyChat4m"), n: 3, time: "19:30" },
    { name: t("landing.storyChat5"), msg: t("landing.storyChat5m"), n: 12, time: "18:02" },
  ];
  return (
    <>
      <div className="pb-3 text-[17px] font-semibold">{t("landing.storyChatsTitle")}</div>
      <div className="flex flex-col">
        {rows.map((r, i) => (
          <motion.div key={r.name} {...pop(0.08 + i * 0.07, 8)} className="flex items-center gap-2.5 py-2.5">
            <Monogram name={r.name} className="size-10 rounded-full text-xs" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium">{r.name}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">{r.time}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-2xs text-muted-foreground">{r.msg}</span>
                <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white tabular-nums">
                  {r.n}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}

function AskScreen() {
  const { t } = useI18n();
  const pop = usePop();
  const request = t("landing.storyUser");
  const end = typingEnd(request);
  const { shown, done } = useTyped(request, 0.35);
  const step = useSteps([end + 0.1, end + 0.9]); // 1 = sent, assistant typing; 2 = reply
  const options = [t("landing.storyCapHalls"), t("landing.storyCapPhoto"), t("landing.storyCapHosts")];
  return (
    <>
      <div className="flex items-center gap-2 pb-4 text-sm font-medium">
        <LogoMark className="h-3.5 w-auto" />
        EVENTUS AI
      </div>
      <div className="flex flex-1 flex-col gap-2.5">
        {step >= 1 && (
          <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[13px] leading-snug text-white">{request}</div>
        )}
        {step === 1 && (
          <motion.div {...pop(0)} className="w-fit rounded-2xl rounded-bl-md bg-foreground/[0.06] px-3.5 py-2 text-foreground/50">
            <TypingDots />
          </motion.div>
        )}
        {step >= 2 && (
          <motion.div {...pop(0)} className="max-w-[92%] rounded-2xl rounded-bl-md bg-foreground/[0.06] px-3.5 py-2.5 text-[13px] leading-snug">
            {t("landing.storyBot")}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {options.map((o, i) => (
                <motion.span key={o} {...pop(0.25 + i * 0.08, 6)} className="rounded-full bg-white px-2.5 py-1 text-2xs font-medium">
                  {o}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
      <InputBar
        active={done && step < 1}
        text={
          step >= 1 ? undefined : (
            <span className="text-foreground">
              {shown}
              {!done && <span className="ml-px inline-block h-3.5 w-px animate-pulse bg-foreground align-middle" />}
            </span>
          )
        }
      />
    </>
  );
}

const BUDGET = 1_500_000;
const SPLIT = [
  { key: "storyB1", pct: 55, cls: "stroke-primary", dot: "bg-primary" },
  { key: "storyB2", pct: 12, cls: "stroke-ink", dot: "bg-ink" },
  { key: "storyB3", pct: 10, cls: "stroke-sun", dot: "bg-sun" },
  { key: "storyB4", pct: 8, cls: "stroke-gold", dot: "bg-gold" },
  { key: "storyB5", pct: 5, cls: "stroke-primary/45", dot: "bg-primary/45" },
  { key: "storyB6", pct: 10, cls: "stroke-foreground/15", dot: "bg-foreground/15" },
] as const;
const R_BUDGET = 34;
const C_BUDGET = 2 * Math.PI * R_BUDGET;
/** ring segments: length and start offset of each share */
const ARCS = SPLIT.map((s, i) => ({
  len: (s.pct / 100) * C_BUDGET,
  start: (SPLIT.slice(0, i).reduce((a, x) => a + x.pct, 0) / 100) * C_BUDGET,
}));

function BudgetScreen() {
  const { t, money, num } = useI18n();
  const pop = usePop();
  const dur = useDur();
  const R = R_BUDGET;
  const C = C_BUDGET;
  return (
    <>
      <div className="pb-2 text-sm font-medium">{t("landing.storyBudgetTitle")}</div>
      <div className="relative mx-auto size-[150px]">
        <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
          {SPLIT.map((s, i) => {
            const { len, start } = ARCS[i];
            return (
              <motion.circle
                key={s.key}
                cx="40"
                cy="40"
                r={R}
                fill="none"
                strokeWidth="8"
                className={s.cls}
                strokeDashoffset={-start}
                initial={{ strokeDasharray: `0 ${C}` }}
                animate={{ strokeDasharray: `${Math.max(0, len - 1.2)} ${C}` }}
                transition={{ duration: dur(0.5), ease: EASE, delay: dur(0.25 + i * 0.16) }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="display text-[19px] tabular-nums">
            <CountUp to={BUDGET} delay={0.2} duration={1.2} format={num} />
          </span>
          <span className="text-2xs text-muted-foreground">{t("common.som")}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {SPLIT.map((s, i) => (
          <motion.div key={s.key} {...pop(0.35 + i * 0.16, 6)} className="flex items-center gap-2 text-[12px]">
            <span className={cn("size-2 shrink-0 rounded-full", s.dot)} />
            <span className="flex-1 truncate">{t(`landing.${s.key}`)}</span>
            <span className="text-muted-foreground tabular-nums">{money((BUDGET * s.pct) / 100)}</span>
          </motion.div>
        ))}
      </div>
    </>
  );
}

function FeedScreen() {
  const { t } = useI18n();
  const pop = usePop();
  const posts = [
    { vendor: useVendor("cars"), free: 3 },
    { vendor: useVendor("halls"), free: 6 },
  ];
  return (
    <>
      <div className="pb-3 text-sm font-medium">{t("landing.storyFeedTitle")}</div>
      <div className="flex flex-col gap-3">
        {posts.map(({ vendor, free }, i) => (
          <motion.div key={i} {...pop(0.1 + i * 0.12, 16 - i * 4)} className="rounded-[20px] bg-foreground/[0.045] p-2">
            <Cover vendor={vendor} sizes="250px" className="h-[118px] rounded-[14px]" />
            <div className="px-1.5 pt-2 pb-1">
              <div className="flex items-center gap-1 truncate text-[13px] font-medium">
                {vendor?.name}
                {vendor?.verified && <VerifiedSeal className="[&_svg]:size-3.5" />}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-2xs text-text-secondary">
                <Dots free={free} total={10} delay={0.45 + i * 0.12} />
                {t("landing.mockFree", { free, total: 10 })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}

function InboxScreen() {
  const { t } = useI18n();
  const pop = usePop();
  const all = useVendors();
  const vendors = (["halls", "photo", "hosts", "cars", "decor"] as const).map((cat) => ({ cat, vendor: all[cat] }));
  // statuses flip to «booked» one after another
  const flips = useSteps([0.7, 1.2, 1.7]);
  const status = (i: number) => {
    if (i === 0 || (i === 2 && flips >= 1) || (i === 1 && flips >= 2) || (i === 3 && flips >= 3)) return "booked";
    return i === 4 ? "waiting" : "agreed";
  };
  const pill = {
    booked: ["bg-success/12 text-success", t("landing.storySt1")],
    agreed: ["bg-primary/10 text-primary", t("landing.storySt2")],
    waiting: ["bg-foreground/[0.06] text-muted-foreground", t("landing.storySt3")],
  } as const;
  return (
    <>
      <div className="pb-3 text-[17px] font-semibold">{t("landing.storyInboxTitle")}</div>
      <div className="flex flex-col">
        {vendors.map(({ cat, vendor }, i) => {
          const [cls, label] = pill[status(i)];
          return (
            <motion.div key={cat} {...pop(0.08 + i * 0.07, 8)} className="flex items-center gap-2.5 py-2">
              <Cover vendor={vendor} sizes="40px" className="size-10 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{vendor?.name}</span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors duration-300", cls)}>{label}</span>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-auto">
        <InputBar />
      </div>
    </>
  );
}

function EscrowScreen() {
  const { t, money } = useI18n();
  const pop = usePop();
  const dur = useDur();
  const hall = useVendor("halls");
  const reached = useSteps([0.55, 1.15, 1.75]);
  const steps = [t("landing.storyE1"), t("landing.storyE2"), t("landing.storyE3")];
  return (
    <>
      <div className="pb-4 text-sm font-medium">{t("landing.storyPrepay")}</div>
      <motion.div {...pop(0.1, 16)} className="rounded-3xl bg-ink px-4 py-5 text-white">
        <div className="truncate text-2xs text-white/60">{hall?.name}</div>
        <div className="display mt-1 text-[28px] tabular-nums">{money(45_000)}</div>
      </motion.div>
      <div className="mt-5 flex flex-col">
        {steps.map((s, i) => {
          const on = reached > i;
          return (
            <div key={s} className="flex gap-3">
              <div className="flex flex-col items-center">
                <motion.span
                  animate={{ scale: on ? 1 : 0.85 }}
                  transition={{ type: "spring", duration: dur(0.45), bounce: 0.4 }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full transition-colors duration-300",
                    on ? "bg-primary text-white" : "bg-foreground/10 text-transparent",
                  )}
                >
                  <Check className="size-3.5" />
                </motion.span>
                {i < steps.length - 1 && (
                  <span className="relative my-1 h-6 w-0.5 overflow-hidden rounded-full bg-foreground/10">
                    <motion.span
                      className="absolute inset-0 origin-top bg-primary"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: reached > i + 1 ? 1 : 0 }}
                      transition={{ duration: dur(0.5), ease: EASE }}
                    />
                  </span>
                )}
              </div>
              <span className={cn("pt-0.5 text-[13px] transition-colors duration-300", on ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function InviteScreen() {
  const { t } = useI18n();
  const pop = usePop();
  const dur = useDur();
  const photo = useVendor("photo");
  const R = 34;
  const C = 2 * Math.PI * R;
  const share = 97 / 134;
  return (
    <>
      <motion.div {...pop(0.05, 16)} className="relative overflow-hidden rounded-3xl text-center text-white">
        <Cover vendor={photo} sizes="250px" className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-ink/10" aria-hidden />
        <div className="relative px-4 pt-16 pb-5">
          <div className="font-serif text-[28px] leading-none italic">{t("landing.storyInvName")}</div>
          <div className="mt-2 text-2xs text-white/75">{t("landing.storyInvDate")}</div>
        </div>
      </motion.div>
      <div className="relative mx-auto mt-5 size-[124px]">
        <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r={R} fill="none" strokeWidth="7" className="stroke-foreground/10" />
          <motion.circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            className="stroke-primary"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - share) }}
            transition={{ duration: dur(1.6), ease: EASE, delay: dur(0.4) }}
          />
        </svg>
        <div className="display absolute inset-0 flex items-center justify-center text-[24px] tabular-nums">
          <CountUp to={Math.round(share * 100)} delay={0.4} duration={1.6} />%
        </div>
      </div>
      <motion.div {...pop(1.2)} className="mt-2 text-center text-xs text-text-secondary">
        {t("landing.storyRsvp")}
      </motion.div>
    </>
  );
}

/* ───────────── floating details around the phone ───────────── */

export function ClientFloats({ n, side }: { n: ClientN; side: Side }) {
  const { t } = useI18n();
  const cars = useVendor("cars");
  const halls = useVendor("halls");
  const photo = useVendor("photo");
  const decor = useVendor("decor");
  const cakes = useVendor("cakes");
  const f = { side };
  const card = PHOTO_CARD;

  switch (n) {
    case 1:
      return (
        <>
          <Float {...f} top="4%" out={-150} delay={0.5} bob={5} className={card}>
            <PhotoCard vendor={cars} caption={t("landing.storyCapCars")} />
          </Float>
          <Float {...f} inner top="46%" out={-110} delay={0.7} bob={6} className={card}>
            <PhotoCard vendor={halls} caption={t("landing.storyCapHalls")} />
          </Float>
          <Float {...f} top="62%" out={-130} delay={0.9} bob={5.5} className={card}>
            <PhotoCard vendor={photo} caption={t("landing.storyCapPhoto")} />
          </Float>
        </>
      );
    case 2: {
      const notes = [t("landing.storyN1"), t("landing.storyN2"), t("landing.storyN3"), t("landing.storyN4")];
      // they pile up faster and faster — the only noisy scene on the page
      const at = [0.5, 0.95, 1.3, 1.55];
      const pos = [
        { top: "8%", out: -150, inner: false },
        { top: "30%", out: -120, inner: true },
        { top: "55%", out: -140, inner: false },
        { top: "74%", out: -100, inner: true },
      ];
      return (
        <>
          {notes.map((x, i) => (
            <Float key={x} {...f} {...pos[i]} delay={at[i]}>
              <MessageCircle className="size-4 shrink-0 text-success" />
              {x}
            </Float>
          ))}
        </>
      );
    }
    case 3: {
      // chips fly out of the phone while the request is being typed — «the assistant sorts it out»
      const end = typingEnd(t("landing.storyUser"));
      const at = (k: number) => 0.6 + (end - 0.6) * (k / 3);
      return (
        <>
          <Float {...f} top="12%" out={-86} delay={at(0)}>{t("landing.storyChipDate")}</Float>
          <Float {...f} top="31%" out={-122} delay={at(1)}>{t("landing.storyChipCity")}</Float>
          <Float {...f} top="52%" out={-96} delay={at(2)}>{t("landing.storyChipGuests")}</Float>
          <Float {...f} top="72%" out={-116} delay={at(3)}>{t("landing.storyChipBudget")}</Float>
        </>
      );
    }
    case 4:
      return (
        <>
          <Float {...f} top="18%" out={-112} delay={1.2}>
            <Check className="size-4 text-success" />
            {t("landing.storyInBudget")}
          </Float>
          <Float {...f} top="64%" out={-150} delay={1.5} className="flex-col items-start gap-0.5">
            <span className="text-2xs font-normal text-text-secondary">{t("landing.storyReserve")}</span>
            <span className="text-sm tabular-nums">150 000 {t("common.som")}</span>
          </Float>
        </>
      );
    case 5:
      return (
        <>
          <Float {...f} top="2%" out={-140} delay={0.45} bob={5} className={card}>
            <PhotoCard vendor={photo} caption={t("landing.storyCapPhoto")} rating />
          </Float>
          <Float {...f} top="50%" out={-160} delay={0.65} bob={6} className={card}>
            <PhotoCard vendor={decor} caption={t("landing.storyCapDecor")} rating />
          </Float>
          <Float {...f} inner top="58%" out={-104} delay={0.85} bob={5.5} className={card}>
            <PhotoCard vendor={cakes} caption={t("landing.storyCapCakes")} rating />
          </Float>
          <Float {...f} inner top="14%" out={-92} delay={1.05} className="text-gold-foreground">
            <BadgeCheck className="size-4 text-gold" />
            {t("common.verified")}
          </Float>
        </>
      );
    case 6:
      return (
        <Float {...f} inner top="66%" out={-150} delay={0.9} className="w-[230px] flex-col items-start gap-1.5 whitespace-normal">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-2xs text-primary">
            <Bot className="size-3" />
            {t("landing.storyAi")}
          </span>
          <span className="text-[13px] leading-snug font-normal">{t("landing.storyReply")}</span>
        </Float>
      );
    case 7:
      return (
        <Float {...f} top="16%" out={-128} delay={0.35} className="bg-sun text-sun-foreground">
          <ShieldCheck className="size-4" />
          {t("landing.storyProtected")}
        </Float>
      );
    case 8:
      return (
        <>
          <Float {...f} top="10%" out={-124} delay={0.9}>
            <Check className="size-3.5 text-primary" />
            {t("landing.storyGuest1")}
          </Float>
          <Float {...f} top="34%" out={-150} delay={1.15}>
            <Check className="size-3.5 text-primary" />
            {t("landing.storyGuest2")}
          </Float>
          <Float {...f} top="58%" out={-110} delay={1.4}>
            <span className="size-2 rounded-full bg-foreground/25" />
            {t("landing.storyGuest3")}
          </Float>
          <Float {...f} inner top="70%" out={-90} delay={1.8} className="bg-sun text-sun-foreground">
            {t("landing.storySeats")}
          </Float>
        </>
      );
    case 9:
      return <InstallFloat side={side} />;
    default:
      return null;
  }
}
