"use client";

/**
 * «Add to Home Screen», played on the story phone: the browser, the share sheet (iPhone) or the ⋮ menu
 * (Android), the confirm step and the icon landing on the home screen — looping, with a caption per step.
 * The platform toggle lives in the copy column (InstallControls); both read one tiny store.
 * On Android Chrome the real install prompt (beforeinstallprompt) turns into an «Install» button.
 */
import { ChevronLeft, ChevronRight, Copy, MoreVertical, Plus, Share, SquarePlus, Star, BookOpen, Download, History, Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { EASE, Float, useDur, useReduce, type Side } from "./story-kit";

type Platform = "ios" | "android";

const detect = (): Platform => (typeof navigator !== "undefined" && /android/i.test(navigator.userAgent) ? "android" : "ios");
const usePlatform = create<{ platform: Platform | null; set: (p: Platform) => void }>((set) => ({ platform: null, set: (platform) => set({ platform }) }));
function useCurrentPlatform(): Platform {
  const p = usePlatform((s) => s.platform);
  return p ?? detect();
}

/** The browser's install prompt, captured once per page (Android Chrome, desktop Chrome/Edge) */
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const usePrompt = create<{ event: InstallPrompt | null }>(() => ({ event: null }));
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    usePrompt.setState({ event: e as InstallPrompt });
  });
  window.addEventListener("appinstalled", () => usePrompt.setState({ event: null }));
}

const STEPS = 4;
const STEP_MS = 1900;

/** Step 0…3, looping (the caller remounts it per platform to restart). Reduced motion: stays on the last step. */
function useLoop() {
  const reduce = useReduce();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % STEPS), STEP_MS);
    return () => window.clearInterval(id);
  }, [reduce]);
  return reduce ? STEPS - 1 : step;
}

/** A finger tap: a ring that pulses on the control being pressed */
function Tap({ className }: { className?: string }) {
  const dur = useDur();
  return (
    <motion.span
      aria-hidden
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: [0.4, 1, 1.25], opacity: [0, 0.9, 0] }}
      transition={{ duration: dur(1.1), delay: dur(0.55), ease: EASE }}
      className={cn("pointer-events-none absolute size-9 rounded-full bg-primary/35 ring-2 ring-primary", className)}
    />
  );
}

function AppIcon({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center justify-center rounded-[14px] bg-ink", className)}>
      <LogoMark className="h-2.5 w-auto text-white" />
    </span>
  );
}

/** The site as it looks in the browser — a calm stand-in for our own page */
function Page() {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-ink px-6 text-center text-white">
      <LogoMark className="h-4 w-auto text-white" />
      <span className="display text-[17px] leading-tight">{t("landing.installPageTitle")}</span>
      <span className="h-1.5 w-24 rounded-full bg-white/15" />
      <span className="h-1.5 w-16 rounded-full bg-white/15" />
      <span className="mt-2 rounded-full bg-sun px-4 py-1.5 text-[11px] font-medium text-sun-foreground">{t("landing.start")}</span>
    </div>
  );
}

function HomeScreen() {
  const dur = useDur();
  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-primary to-ink px-5 pt-14">
      <div className="grid grid-cols-4 gap-x-3 gap-y-4">
        {Array.from({ length: 11 }, (_, i) => (
          <span key={i} className="flex flex-col items-center gap-1">
            <span className="size-11 rounded-[13px] bg-white/20" />
            <span className="h-1 w-7 rounded-full bg-white/25" />
          </span>
        ))}
        <motion.span
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 14, delay: dur(0.25) }}
          className="flex flex-col items-center gap-1"
        >
          <AppIcon className="size-11 shadow-lift ring-2 ring-sun" />
          <span className="text-[8px] font-medium text-white">EVENTUS</span>
        </motion.span>
      </div>
    </div>
  );
}

function IosFlow({ step }: { step: number }) {
  const { t } = useI18n();
  const dur = useDur();
  const actions = [
    { icon: Copy, label: t("landing.iosCopy") },
    { icon: BookOpen, label: t("landing.iosReading") },
    { icon: Star, label: t("landing.iosFavorite") },
    { icon: SquarePlus, label: t("landing.iosAddHome"), hit: true },
    { icon: Plus, label: t("landing.iosQuickNote") },
  ];
  if (step === 3) return <HomeScreen />;
  if (step === 2)
    return (
      <div className="flex flex-1 flex-col bg-[#f2f2f7] text-ink">
        <div className="relative flex items-center justify-between px-4 pt-12 pb-3 text-[11px]">
          <span className="text-primary">{t("landing.iosCancel")}</span>
          <span className="font-semibold">{t("landing.iosAddHome")}</span>
          <span className="relative font-semibold text-primary">
            {t("landing.iosAdd")}
            <Tap className="-top-2.5 -left-2" />
          </span>
        </div>
        <div className="mx-3 flex items-center gap-3 rounded-xl bg-white p-3">
          <AppIcon className="size-12" />
          <span className="flex min-w-0 flex-col gap-1 text-[11px]">
            <span className="font-medium">{brand.name}</span>
            <span className="truncate text-muted-foreground">eventusai.app</span>
          </span>
        </div>
        <p className="mx-4 mt-2 text-[9px] leading-snug text-muted-foreground">{t("landing.iosAddHint")}</p>
      </div>
    );
  return (
    <div className="relative flex flex-1 flex-col">
      <Page />
      {/* Safari's bottom bar */}
      <div className="bg-[#f7f7f8] px-3 pt-2 pb-5 text-ink">
        <div className="mx-auto mb-2 w-fit rounded-lg bg-black/[0.06] px-6 py-1 text-[10px]">eventusai.app</div>
        <div className="flex items-center justify-between px-2 text-primary">
          <ChevronLeft className="size-4" />
          <ChevronRight className="size-4 opacity-40" />
          <span className="relative flex">
            <Share className="size-4" />
            {step === 0 && <Tap className="-top-2.5 -left-2.5" />}
          </span>
          <BookOpen className="size-4" />
          <Copy className="size-4" />
        </div>
      </div>
      {/* share sheet: slides up, then the list scrolls to «Add to Home Screen» */}
      <AnimatePresence>
        {step === 1 && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: dur(0.2) } }}
            transition={{ duration: dur(0.45), ease: EASE }}
            className="absolute inset-x-0 bottom-0 h-[72%] overflow-hidden rounded-t-[18px] bg-[#f2f2f7] text-ink shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.3)]"
          >
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <AppIcon className="size-8 rounded-[9px]" />
              <span className="flex flex-col text-[10px] leading-tight">
                <span className="font-medium">{brand.name}</span>
                <span className="text-muted-foreground">eventusai.app</span>
              </span>
            </div>
            <div className="flex gap-2 px-3 pb-3">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="size-9 shrink-0 rounded-full bg-black/[0.07]" />
              ))}
            </div>
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: -70 }}
              transition={{ duration: dur(0.6), delay: dur(0.55), ease: EASE }}
              className="mx-3 overflow-hidden rounded-xl bg-white"
            >
              {[...actions, { icon: Download, label: t("landing.iosSaveFiles") }].map(({ icon: Icon, label, ...a }) => (
                <span
                  key={label}
                  className={cn(
                    "relative flex items-center justify-between border-b border-black/[0.06] px-3 py-2.5 text-[11px] last:border-0",
                    "hit" in a && "bg-primary/10 font-medium",
                  )}
                >
                  {label}
                  <Icon className="size-3.5" />
                  {"hit" in a && <Tap className="top-0.5 left-8" />}
                </span>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AndroidFlow({ step }: { step: number }) {
  const { t } = useI18n();
  const dur = useDur();
  if (step === 3) return <HomeScreen />;
  return (
    <div className="relative flex flex-1 flex-col">
      {/* Chrome's top bar */}
      <div className="flex items-center gap-2 bg-[#f1f3f4] px-3 pt-11 pb-2 text-ink">
        <span className="flex-1 truncate rounded-full bg-white px-3 py-1.5 text-[10px]">eventusai.app</span>
        <span className="relative flex">
          <MoreVertical className="size-4" />
          {step === 0 && <Tap className="-top-2.5 -left-2.5" />}
        </span>
      </div>
      <Page />
      <AnimatePresence>
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: dur(0.15) } }}
            transition={{ duration: dur(0.3), ease: EASE }}
            style={{ transformOrigin: "top right" }}
            className="absolute top-11 right-2 w-[170px] overflow-hidden rounded-xl bg-white py-1 text-[11px] text-ink shadow-lift"
          >
            {[
              { icon: Plus, label: t("landing.andNewTab") },
              { icon: History, label: t("landing.andHistory") },
              { icon: Download, label: t("landing.andDownloads") },
              { icon: Smartphone, label: t("landing.andAddHome"), hit: true },
            ].map(({ icon: Icon, label, ...a }) => (
              <span key={label} className={cn("relative flex items-center gap-2.5 px-3 py-2", "hit" in a && "bg-primary/10 font-medium")}>
                <Icon className="size-3.5 text-muted-foreground" />
                {label}
                {"hit" in a && <Tap className="top-0 left-6" />}
              </span>
            ))}
          </motion.div>
        )}
        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/40 px-4">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: dur(0.3), ease: EASE }}
              className="w-full rounded-2xl bg-white p-4 text-ink"
            >
              <span className="text-[13px] font-medium">{t("landing.andInstallTitle")}</span>
              <span className="mt-3 flex items-center gap-2.5">
                <AppIcon className="size-9 rounded-[10px]" />
                <span className="flex flex-col text-[10px] leading-tight">
                  <span className="font-medium">{brand.name}</span>
                  <span className="text-muted-foreground">eventusai.app</span>
                </span>
              </span>
              <span className="mt-4 flex justify-end gap-4 text-[11px] font-medium text-primary">
                <span>{t("landing.iosCancel")}</span>
                <span className="relative">
                  {t("landing.andInstall")}
                  <Tap className="-top-2.5 -left-1" />
                </span>
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Phone screen for the «install» scene of both stories */
export function InstallScreen() {
  const platform = useCurrentPlatform();
  return <InstallLoop key={platform} platform={platform} />;
}

function InstallLoop({ platform }: { platform: Platform }) {
  const { t } = useI18n();
  const dur = useDur();
  const step = useLoop();
  const caption = t(`landing.${platform}Step${step + 1}` as "landing.iosStep1");
  return (
    // full-bleed: undo the story screen's padding
    <div className="relative -mx-4 -mt-[52px] -mb-4 flex flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${platform}-${step === 3 ? "home" : "browser"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur(0.25) }}
          className="flex flex-1 flex-col"
        >
          {platform === "ios" ? <IosFlow step={step} /> : <AndroidFlow step={step} />}
        </motion.div>
      </AnimatePresence>
      {/* what is happening, step by step */}
      {/* in the free part of the screen: above the share sheet on iPhone, below everything otherwise */}
      <div className={cn("pointer-events-none absolute inset-x-3 flex justify-center", platform === "ios" && step < 2 ? "top-11" : "bottom-5")}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${platform}-${step}`}
            initial={{ opacity: 0, y: dur(6) }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: dur(-4) }}
            transition={{ duration: dur(0.25) }}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-medium text-ink shadow-lift"
          >
            <span className="flex size-4 items-center justify-center rounded-full bg-sun text-[9px] text-sun-foreground tabular-nums">{step + 1}</span>
            {caption}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Platform toggle (iPhone / Android) and, where the browser allows it, a real «Install» button */
export function InstallControls({ dark }: { dark: boolean }) {
  const { t } = useI18n();
  const platform = useCurrentPlatform();
  const set = usePlatform((s) => s.set);
  const prompt = usePrompt((s) => s.event);
  return (
    <div className="flex flex-col gap-3">
      <div className={cn("flex w-fit gap-0.5 rounded-full p-1 text-sm", dark ? "bg-white/10" : "bg-foreground/[0.06]")}>
        {(["ios", "android"] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={platform === p}
            onClick={() => set(p)}
            className={cn("h-9 rounded-full px-4 transition-colors", platform === p ? "bg-ink text-white" : "opacity-70 hover:opacity-100")}
          >
            {t(p === "ios" ? "landing.installIos" : "landing.installAndroid")}
          </button>
        ))}
      </div>
      <p className={cn("max-w-md text-xs leading-relaxed", dark ? "text-white/60" : "text-text-secondary")}>
        {t(platform === "ios" ? "landing.installIosNote" : "landing.installAndroidNote")}
      </p>
      {prompt && (
        <Button
          variant="sun"
          className="h-11 w-fit px-5"
          onClick={() => {
            void prompt.prompt();
            usePrompt.setState({ event: null });
          }}
        >
          <Download />
          {t("landing.installNow")}
        </Button>
      )}
    </div>
  );
}

/** «No App Store, no Google Play» next to the phone */
export function InstallFloat({ side }: { side: Side }) {
  const { t } = useI18n();
  return (
    <Float side={side} top="10%" out={-200} delay={0.6} className="bg-sun text-sun-foreground">
      <Smartphone className="size-4" />
      {t("landing.installNoStore")}
    </Float>
  );
}
