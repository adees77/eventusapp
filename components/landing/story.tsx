"use client";

/**
 * The landing page: one scroll story (pattern studied on dona.uz). A sticky stage holds the header,
 * the copy and one phone that travels between nine scenes while the background, screen and floating
 * details change with scroll. Screens and floats live in story-screens.tsx.
 *
 * Motion rules (choreograph / animate skills): transform + opacity only, one entrance per container,
 * the lead (headline, phone) travels farther than support, exits short and simultaneous,
 * prefers-reduced-motion shows every end state at once.
 */
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { TryDemoButton } from "@/components/demo/try-demo-button";
import { LinkButton } from "@/components/ui/link-button";
import { useShowcase } from "@/lib/data/views/landing";
import type { CategoryId } from "@/lib/data/types";
import { LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { brand } from "@/config/brand";
import { EASE, Floats, Screen, StoryCtx, type N, type Side } from "./story-screens";

const PHONE_W = 290;
const PHONE_H = 600;

/** background, text colour mode and phone side per scene */
const SCENES: { n: N; bg: string; dark: boolean; side: Side }[] = [
  { n: 1, bg: "bg-ink", dark: true, side: 1 },
  { n: 2, bg: "bg-cream", dark: false, side: -1 },
  { n: 3, bg: "bg-ink", dark: true, side: 1 },
  { n: 4, bg: "bg-cream", dark: false, side: -1 },
  { n: 5, bg: "bg-primary", dark: true, side: 1 },
  { n: 6, bg: "bg-ink", dark: true, side: -1 },
  { n: 7, bg: "bg-cream", dark: false, side: 1 },
  { n: 8, bg: "bg-primary", dark: true, side: -1 },
  { n: 9, bg: "bg-ink", dark: true, side: 1 },
];
const TOTAL = SCENES.length;
/** categories whose real vendors (cover, name, rating) appear in the mocks */
const SHOWCASE: CategoryId[] = ["cars", "halls", "photo", "decor", "cakes", "hosts"];

export function Story() {
  const { t } = useI18n();
  const reduce = !!useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState(0);
  const layout = useStageLayout(stageRef);
  const showcase = useShowcase(SHOWCASE);
  const ctx = useMemo(() => ({ reduce, vendors: Object.fromEntries(showcase.map((s) => [s.vendor.category, s.vendor])) }), [reduce, showcase]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setScene(Math.min(TOTAL - 1, Math.max(0, Math.floor(v * TOTAL)))));
  /** progress inside the current scene, 0…1 — fills the active step pill */
  const inScene = useTransform(scrollYProgress, (v) => (v >= 1 ? 1 : (v * TOTAL) % 1));

  const cur = SCENES[scene];
  const dur = (s: number) => (reduce ? 0 : s);

  const goTo = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const range = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + ((i + 0.35) / TOTAL) * range, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <StoryCtx.Provider value={ctx}>
      <section ref={sectionRef} id="story" className="p-2 md:p-3" style={{ height: `${TOTAL * 85}svh` }} aria-label={t("landing.storyKicker")}>
        <div
          ref={stageRef}
          className={cn(
            "sticky top-2 h-[calc(100svh-1rem)] overflow-hidden rounded-[28px] transition-colors duration-700 md:top-3 md:h-[calc(100svh-1.5rem)] md:rounded-[36px]",
            cur.bg,
            cur.dark ? "text-white" : "text-foreground",
          )}
        >
          <TopBar dark={cur.dark} />

          {/* copy: lower part on phones, a column on desktop */}
          <div className="container-app absolute inset-x-0 top-[54%] bottom-0 grid grid-cols-1 content-start pt-1 lg:top-20 lg:bottom-6 lg:grid-cols-2 lg:content-center lg:pt-0">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={scene}
                exit={{ opacity: 0, y: dur(-10), transition: { duration: dur(0.16) } }}
                className={cn("max-w-lg", cur.side === 1 ? "lg:col-start-1" : "lg:col-start-2 lg:justify-self-end")}
              >
                <Copy n={cur.n} dark={cur.dark} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* phone: one object that travels across scenes */}
          <div className="pointer-events-none absolute inset-x-0 top-16 flex h-[calc(54%-4rem)] items-center justify-center [perspective:1400px] lg:top-20 lg:bottom-6 lg:h-auto">
            <motion.div
              initial={{ opacity: 0, y: dur(140) }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: dur(1.2), ease: EASE }}
            >
              <motion.div
                initial={false}
                animate={{ x: cur.side * layout.shift, rotateY: reduce || !layout.desktop ? 0 : cur.side * -7, scale: layout.scale }}
                transition={{ duration: dur(0.95), ease: EASE }}
                className="relative will-change-transform"
                style={{ width: PHONE_W, height: PHONE_H }}
              >
                <Rings scene={scene} />

                <div className="absolute inset-0 rounded-[46px] bg-black p-[11px] shadow-[0_60px_100px_-30px_rgba(5,4,30,0.65)]">
                  <div className="relative h-full overflow-hidden rounded-[36px] bg-white text-foreground">
                    <span className="absolute top-3 left-1/2 z-10 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-black" aria-hidden />
                    <AnimatePresence initial={false}>
                      <motion.div
                        key={scene}
                        initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, transition: { duration: dur(0.2) } }}
                        transition={{ duration: dur(0.45), ease: EASE }}
                        className="absolute inset-0 flex flex-col px-4 pt-[52px] pb-4"
                      >
                        <Screen n={cur.n} />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  <Floats key={scene} n={cur.n} side={cur.side} />
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </div>

          <StepSwitch scene={scene} inScene={inScene} onPick={goTo} />
        </div>
      </section>
    </StoryCtx.Provider>
  );
}

function TopBar({ dark }: { dark: boolean }) {
  const { t, locale, setLocale } = useI18n();
  return (
    <header className="container-app absolute inset-x-0 top-0 z-20 flex h-16 items-center gap-3 md:h-20">
      <Link href="/" aria-label={brand.name} className={cn("shrink-0 whitespace-nowrap", dark && "[&_*]:!text-white")}>
        <Logo />
      </Link>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="hidden gap-0.5 sm:flex">
          {LOCALES.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setLocale(x)}
              aria-pressed={x === locale}
              className={cn(
                "h-8 rounded-full px-2.5 text-xs uppercase transition-colors",
                x === locale ? (dark ? "bg-white/15" : "bg-foreground/[0.07]") : "opacity-60 hover:opacity-100",
              )}
            >
              {x}
            </button>
          ))}
        </div>
        <Link href={routes.welcome} className="hidden h-9 items-center px-3 text-sm opacity-75 sm:flex transition-opacity hover:opacity-100">
          {t("landing.signIn")}
        </Link>
        <LinkButton href={routes.welcome} variant="sun" className="h-9 px-4">
          {t("landing.start")}
        </LinkButton>
      </div>
    </header>
  );
}

function Copy({ n, dark }: { n: N; dark: boolean }) {
  const { t } = useI18n();
  const reduce = !!useReducedMotion();
  const dur = (s: number) => (reduce ? 0 : s);
  const soft = dark ? "text-white/70" : "text-text-secondary";
  const head = "display mt-3 leading-[1.04] lg:mt-5";

  return (
    <>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur(0.4) }}
        className={cn("inline-flex items-center gap-3 text-xs font-medium tabular-nums", dark ? "text-white/60" : "text-text-secondary")}
      >
        {String(n).padStart(2, "0")}
        <span className="h-px w-8 bg-current opacity-40" />
        {t(`landing.story${n}k`)}
      </motion.span>

      <motion.div initial={{ opacity: 0, y: dur(32) }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur(0.65), ease: EASE }}>
        {n === 1 ? (
          <h1 className={cn(head, "text-[32px] md:text-5xl lg:text-[64px]")}>
            {t("landing.storyHeroA")} <span className="text-sun">{t("landing.storyHeroB")}</span>
          </h1>
        ) : (
          <h2 className={cn(head, "text-[28px] md:text-5xl lg:text-[56px]")}>{t(`landing.story${n}t`)}</h2>
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: dur(14) }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur(0.55), ease: EASE, delay: dur(0.08) }}
        className={cn("mt-3 text-sm leading-relaxed md:text-md lg:mt-5 lg:max-w-md", soft)}
      >
        {t(`landing.story${n}p`)}
      </motion.p>

      {(n === 1 || n === TOTAL) && (
        <motion.div
          initial={{ opacity: 0, y: dur(10) }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur(0.5), ease: EASE, delay: dur(0.18) }}
          className="mt-5 flex flex-wrap items-center gap-2 lg:mt-8"
        >
          <LinkButton href={routes.welcome} variant="sun" className="h-11 px-5 text-md lg:h-12 lg:px-6">
            {t("landing.ctaClient")}
            <ArrowRight />
          </LinkButton>
          <LinkButton
            href={routes.welcomeVendor}
            className={cn("hidden h-11 px-5 sm:inline-flex lg:h-12", dark ? "bg-white/10 text-white hover:bg-white/15" : "bg-foreground/[0.06] text-foreground hover:bg-foreground/10")}
          >
            {n === 1 ? t("landing.ctaVendor") : t("landing.storyVendorCta")}
          </LinkButton>
          {n === 1 && <TryDemoButton className={cn("ml-1 hidden sm:block", dark ? "text-white/60 hover:text-white" : "text-text-secondary")} />}
        </motion.div>
      )}
    </>
  );
}

/** Measures the sticky stage: phone offset from the centre and its scale to fit the height. */
function useStageLayout(ref: React.RefObject<HTMLDivElement | null>) {
  const [layout, setLayout] = useState({ desktop: true, shift: 0, scale: 1 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calc = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      const desktop = window.innerWidth >= 1024;
      setLayout(
        desktop
          ? { desktop, shift: Math.min(w * 0.24, 340), scale: Math.min(1, (h - 80 - 24 - 32) / PHONE_H) }
          : { desktop, shift: 0, scale: Math.min(0.72, (h * 0.54 - 64 - 12) / PHONE_H) },
      );
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return layout;
}

/** Dona-style concentric rings behind the phone; they breathe out once on every scene change. */
function Rings({ scene }: { scene: number }) {
  const reduce = !!useReducedMotion();
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
      <motion.div key={scene} initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: reduce ? 0 : 1.1, ease: EASE }}>
        {[620, 880, 1140].map((d, i) => (
          <span
            key={d}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current"
            style={{ width: d, height: d, opacity: 0.09 - i * 0.025 }}
          />
        ))}
      </motion.div>
    </div>
  );
}

/** Step pills: vertical on desktop, a row at the bottom on phones; the active one fills with scroll. */
function StepSwitch({ scene, inScene, onPick }: { scene: number; inScene: MotionValue<number>; onPick: (i: number) => void }) {
  const { t } = useI18n();
  return (
    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-0.5 lg:top-1/2 lg:right-5 lg:bottom-auto lg:left-auto lg:translate-x-0 lg:-translate-y-1/2 lg:flex-col">
      {SCENES.map((s, i) => {
        const active = i === scene;
        return (
          <button
            key={s.n}
            type="button"
            onClick={() => onPick(i)}
            aria-label={t("landing.storyScene", { n: s.n, total: TOTAL })}
            aria-current={active ? "step" : undefined}
            className="flex items-center justify-center p-1"
          >
            <span
              className={cn(
                "relative block overflow-hidden rounded-full transition-all duration-300",
                active ? "h-1.5 w-7 bg-current/25 lg:h-7 lg:w-1.5" : "size-1.5",
                !active && (i < scene ? "bg-current/60" : "bg-current/25"),
              )}
            >
              {active && (
                <motion.span
                  className="absolute inset-0 origin-left rounded-full bg-current [transform:scaleX(var(--p))] lg:origin-top lg:[transform:scaleY(var(--p))]"
                  style={{ "--p": inScene } as never}
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
