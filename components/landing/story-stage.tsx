"use client";

/**
 * The scroll-story engine behind / (clients) and /for-vendors (pattern studied on dona.uz).
 * A sticky stage holds the top bar, the copy and one phone that travels between scenes while the
 * background, screen and floating details change. Each scene sets a pose (angle, lean, height) and the
 * phone springs into it; between poses it sways gently with scroll so it never sits dead still.
 * A Dona-style dock at the bottom steps back / forward («Далее»); scrolling works the same.
 *
 * Motion rules (choreograph / animate skills): transform + opacity only, one entrance per container,
 * the lead (headline, phone) travels farther than support, exits short and simultaneous,
 * prefers-reduced-motion shows every end state at once and keeps the phone upright.
 */
import { ArrowDown, ArrowUp, BriefcaseBusiness, UsersRound } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/link-button";
import { track } from "@/lib/analytics";
import type { StoryPage } from "@/lib/analytics/events";
import { useAuth } from "@/lib/auth/store";
import { useShowcase } from "@/lib/data/views/landing";
import type { CategoryId } from "@/lib/data/types";
import { LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { brand } from "@/config/brand";
import { EASE, StoryCtx, type Side } from "./story-kit";

const PHONE_W = 290;
const PHONE_H = 600;
/** categories whose real vendors (cover, name, rating) appear in the mocks */
const SHOWCASE: CategoryId[] = ["cars", "halls", "photo", "decor", "cakes", "hosts"];
/** scenes already reported this visit, per story */
const seenScenes: Record<StoryPage, Set<number>> = { client: new Set(), vendor: new Set() };

/** How the phone stands in a scene: turn (ry) and lean (rz) in degrees, tilt back (rx), lift (y, px), scale. */
export type Pose = { ry: number; rz?: number; rx?: number; y?: number; s?: number };
export type SceneDef<T extends number> = { n: T; bg: string; dark: boolean; side: Side; pose: Pose };
export type CopyDef = { kicker: string; title: ReactNode; h1?: boolean; text: string; extra?: ReactNode; /** hide the paragraph on phones (scenes with a long extra) */ compact?: boolean };

export function StoryStage<T extends number>({
  page,
  label,
  scenes,
  copy,
  screen,
  floats,
  hud,
  startHref,
}: {
  /** which story this is — tags its analytics events */
  page: StoryPage;
  label: string;
  scenes: SceneDef<T>[];
  copy: (n: T, dark: boolean) => CopyDef;
  screen: (n: T) => ReactNode;
  floats: (n: T, side: Side) => ReactNode;
  /** an optional game-style bar under the top bar (vendors: level, achievements, earnings) */
  hud?: (scene: number, dark: boolean) => ReactNode;
  /** where the top bar's main button leads */
  startHref: string;
}) {
  const reduce = !!useReducedMotion();
  const total = scenes.length;
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState(0);
  const layout = useStageLayout(stageRef);
  const showcase = useShowcase(SHOWCASE);
  const ctx = useMemo(() => ({ reduce, vendors: Object.fromEntries(showcase.map((s) => [s.vendor.category, s.vendor])) }), [reduce, showcase]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setScene(Math.min(total - 1, Math.max(0, Math.floor(v * total)))));
  /** progress inside the current scene, 0…1 — fills the active step dash */
  const inScene = useTransform(scrollYProgress, (v) => (v >= 1 ? 1 : (v * total) % 1));
  // gentle sway tied to scroll: zero at every scene boundary, peaks mid-scene, alternating direction
  const smooth = useSpring(scrollYProgress, { stiffness: 70, damping: 20, mass: 0.6 });
  const swayZ = useTransform(smooth, (v) => (reduce ? 0 : Math.sin(v * total * Math.PI) * 2.4));
  const swayY = useTransform(smooth, (v) => (reduce ? 0 : Math.cos(v * total * Math.PI * 2) * 10));
  const floatY = useTransform(smooth, (v) => (reduce ? 0 : Math.cos(v * total * Math.PI * 2) * -16));

  const cur = scenes[scene];
  const dur = (s: number) => (reduce ? 0 : s);
  const k = layout.desktop ? 1 : 0.55; // phones get a softer version of each pose
  const pose = cur.pose;

  useEffect(() => {
    if (seenScenes[page].has(scene)) return;
    seenScenes[page].add(scene);
    track("story_scene_viewed", { page, scene: scene + 1 });
  }, [page, scene]);

  const goTo = (i: number, action?: "next" | "prev" | "jump" | "top") => {
    if (action) track("story_dock_used", { page, action, scene: scene + 1 });
    const el = sectionRef.current;
    if (!el) return;
    if (i < 0 || i >= total) return window.scrollTo({ top: i < 0 ? 0 : el.offsetTop + el.offsetHeight, behavior: reduce ? "auto" : "smooth" });
    const range = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + (i === 0 ? 0 : ((i + 0.35) / total) * range), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <StoryCtx.Provider value={ctx}>
      <section ref={sectionRef} id="story" className="p-2 md:p-3" style={{ height: `${total * 85}svh` }} aria-label={label}>
        <div
          ref={stageRef}
          className={cn(
            // overflow-clip, not hidden: a hidden box can still be scrolled by focus/anchoring and the stage would slide up
            "sticky top-2 h-[calc(100svh-1rem)] overflow-clip rounded-[28px] transition-colors duration-700 md:top-3 md:h-[calc(100svh-1.5rem)] md:rounded-[36px]",
            cur.bg,
            cur.dark ? "text-white" : "text-foreground",
          )}
        >
          <TopBar dark={cur.dark} startHref={startHref} onStart={() => track("landing_cta_clicked", { page, cta: "top_start", scene: scene + 1 })} />
          {/* phones: the second row belongs to the «clients | vendors» switch, so the game bar starts at md */}
          {hud && <div className="absolute inset-x-0 top-20 z-10 max-md:hidden">{hud(scene, cur.dark)}</div>}

          {/* copy: lower part on phones, a column on desktop */}
          <div className="container-app absolute inset-x-0 top-[54%] bottom-16 grid grid-cols-1 content-start lg:top-20 lg:bottom-20 lg:grid-cols-2 lg:content-center">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={scene}
                exit={{ opacity: 0, y: dur(-10), transition: { duration: dur(0.16) } }}
                className={cn("max-w-xl", cur.side === 1 ? "lg:col-start-1" : "lg:col-start-2 lg:justify-self-end")}
              >
                <Copy def={copy(cur.n, cur.dark)} dark={cur.dark} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* phone: one object that travels across scenes */}
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 flex items-center justify-center [perspective:1400px] lg:top-20 lg:bottom-16 lg:h-auto",
              "top-28 h-[calc(54%-7rem)]", !hud && "md:top-16 md:h-[calc(54%-4rem)]",
            )}
          >
            <motion.div
              initial={{ opacity: 0, y: dur(160), rotate: reduce ? 0 : -6 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: dur(1.3), ease: EASE }}
            >
              <motion.div
                initial={false}
                animate={{
                  x: cur.side * layout.shift,
                  y: (pose.y ?? 0) * k,
                  rotateY: reduce ? 0 : pose.ry * k,
                  rotateZ: reduce ? 0 : (pose.rz ?? 0) * k,
                  rotateX: reduce ? 0 : (pose.rx ?? 0) * k,
                  scale: layout.scale * (pose.s ?? 1),
                }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 55, damping: 15, mass: 1.1 }}
                className="relative will-change-transform"
                style={{ width: PHONE_W, height: PHONE_H }}
              >
                <Rings scene={scene} />
                <motion.div className="absolute inset-0" style={{ rotate: swayZ, y: swayY }}>
                  <div className="absolute inset-0 rounded-[46px] bg-black p-[11px] shadow-[0_60px_100px_-30px_rgba(5,4,30,0.65)]">
                    <div className="relative h-full overflow-hidden rounded-[36px] bg-white text-foreground">
                      <span className="absolute top-3 left-1/2 z-10 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-black" aria-hidden />
                      <AnimatePresence initial={false}>
                        <motion.div
                          key={scene}
                          initial={{ opacity: 0, y: dur(18), scale: reduce ? 1 : 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, transition: { duration: dur(0.2) } }}
                          transition={{ duration: dur(0.5), ease: EASE }}
                          className="absolute inset-0 flex flex-col px-4 pt-[52px] pb-4"
                        >
                          {screen(cur.n)}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                  <motion.div className="absolute inset-0" style={{ y: floatY }}>
                    <AnimatePresence initial={false}>
                      <FloatLayer key={scene}>{floats(cur.n, cur.side)}</FloatLayer>
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          <Dock scene={scene} total={total} inScene={inScene} dark={cur.dark} onGo={goTo} />
        </div>
      </section>
    </StoryCtx.Provider>
  );
}

function FloatLayer({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function TopBar({ dark, startHref, onStart }: { dark: boolean; startHref: string; onStart: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const pathname = usePathname();
  // «/» sends a signed-in visitor to their home, so with an account the landing lives at /landing
  const signedIn = !!useAuth((s) => s.userId);
  const home = signedIn ? routes.landing : routes.home;
  const tabs = [
    { href: home, label: t("landing.navClients"), icon: UsersRound },
    { href: routes.forVendors, label: t("landing.navVendors"), icon: BriefcaseBusiness },
  ] as const;
  const on = dark ? "bg-white/15" : "bg-foreground/[0.07]";
  return (
    <header className="container-app absolute inset-x-0 top-0 z-20 flex h-16 items-center gap-2 md:h-20 md:gap-3">
      <Link href={home} aria-label={brand.name} className={cn("shrink-0 whitespace-nowrap", dark && "[&_*]:!text-white")}>
        <Logo />
      </Link>
      {/* «for clients | I'm a vendor» — the switch between the two stories, centred so vendors find their way at once */}
      <nav
        aria-label={t("landing.navLabel")}
        className={cn(
          "flex items-center gap-0.5 rounded-full p-1 text-xs backdrop-blur-md sm:text-sm",
          // phones: its own centred row under the logo; md: in the bar; lg: dead centre of the bar
          "max-md:absolute max-md:top-full max-md:left-1/2 max-md:-translate-x-1/2 md:mx-auto lg:absolute lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2",
          dark ? "bg-white/10" : "bg-white/75",
        )}
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === home && pathname === routes.home);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-3 font-medium whitespace-nowrap transition-colors sm:h-9 sm:px-4",
                active ? "bg-ink text-white" : "opacity-75 hover:opacity-100",
              )}
            >
              <Icon className={cn("size-3.5 max-sm:hidden", active && "text-sun")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0 lg:ml-auto">
        <div className="hidden gap-0.5 lg:flex">
          {LOCALES.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setLocale(x)}
              aria-pressed={x === locale}
              className={cn("h-8 rounded-full px-2.5 text-xs uppercase transition-colors", x === locale ? on : "opacity-60 hover:opacity-100")}
            >
              {x}
            </button>
          ))}
        </div>
        {!signedIn && (
          <Link href={routes.welcome} className="hidden h-9 items-center px-3 text-sm opacity-75 transition-opacity hover:opacity-100 md:flex">
            {t("landing.signIn")}
          </Link>
        )}
        {/* with an account /welcome forwards to the app's home */}
        <LinkButton href={signedIn ? routes.welcome : startHref} variant="sun" className="h-9 px-3.5 sm:px-4" onClick={onStart}>
          {t(signedIn ? "landing.openApp" : "landing.start")}
        </LinkButton>
      </div>
    </header>
  );
}

function Copy({ def, dark }: { def: CopyDef; dark: boolean }) {
  const reduce = !!useReducedMotion();
  const dur = (s: number) => (reduce ? 0 : s);
  const head = "display mt-3 lg:mt-5";
  return (
    <>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur(0.4) }}
        className={cn("inline-flex items-center gap-2.5 text-sm font-medium md:text-base", dark ? "text-white/75" : "text-text-secondary")}
      >
        <span className="size-2 rounded-full bg-sun" aria-hidden />
        {def.kicker}
      </motion.span>

      <motion.div initial={{ opacity: 0, y: dur(32) }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur(0.65), ease: EASE }}>
        {def.h1 ? (
          <h1 className={cn(head, "text-[34px] leading-[1.02] md:text-6xl lg:text-[76px]")}>{def.title}</h1>
        ) : (
          <h2 className={cn(head, "text-[28px] leading-[1.04] md:text-5xl lg:text-[56px]")}>{def.title}</h2>
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: dur(14) }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur(0.55), ease: EASE, delay: dur(0.08) }}
        className={cn("mt-3 text-sm leading-relaxed md:text-md lg:mt-5 lg:max-w-md", def.compact && "max-sm:hidden", dark ? "text-white/70" : "text-text-secondary")}
      >
        {def.text}
      </motion.p>

      {def.extra && (
        <motion.div
          initial={{ opacity: 0, y: dur(10) }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur(0.5), ease: EASE, delay: dur(0.18) }}
          className="mt-5 lg:mt-8"
        >
          {def.extra}
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
          ? { desktop, shift: Math.min(w * 0.24, 340), scale: Math.min(1, (h - 80 - 64 - 32) / PHONE_H) }
          : { desktop, shift: 0, scale: Math.min(0.72, (h * 0.54 - (window.innerWidth < 768 ? 104 : 80)) / PHONE_H) },
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
      <motion.div key={scene} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: reduce ? 0 : 1.2, ease: EASE }}>
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

/** Dona-style dock: back, step dashes (the active one fills with scroll), «Далее» / «Наверх». */
function Dock({
  scene,
  total,
  inScene,
  dark,
  onGo,
}: {
  scene: number;
  total: number;
  inScene: MotionValue<number>;
  dark: boolean;
  onGo: (i: number, action: "next" | "prev" | "jump" | "top") => void;
}) {
  const { t } = useI18n();
  const last = scene === total - 1;
  return (
    <div
      className={cn(
        "absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full p-1.5 text-white shadow-lift md:bottom-5",
        dark ? "bg-white/12 backdrop-blur-md" : "bg-ink",
      )}
    >
      <button
        type="button"
        onClick={() => onGo(scene - 1, "prev")}
        disabled={scene === 0}
        aria-label={t("landing.storyPrev")}
        className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-30"
      >
        <ArrowUp className="size-4" />
      </button>
      <span className="px-1.5 text-xs text-white/70 tabular-nums sm:hidden">
        {scene + 1} / {total}
      </span>
      <div className="hidden items-center px-0.5 sm:flex">
        {Array.from({ length: total }, (_, i) => {
          const active = i === scene;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onGo(i, "jump")}
              aria-label={t("landing.storyScene", { n: i + 1, total })}
              aria-current={active ? "step" : undefined}
              className="flex h-6 items-center px-[3px]"
            >
              <span className={cn("relative block h-1 overflow-hidden rounded-full transition-all duration-300", active ? "w-7 bg-white/25" : cn("w-3", i < scene ? "bg-sun" : "bg-white/25"))}>
                {active && (
                  <motion.span className="absolute inset-0 origin-left rounded-full bg-sun [transform:scaleX(var(--p))]" style={{ "--p": inScene } as never} />
                )}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onGo(last ? -1 : scene + 1, last ? "top" : "next")}
        className="flex h-9 items-center gap-2 rounded-full bg-white pr-1.5 pl-4 text-sm font-medium text-ink transition-transform active:scale-[0.97]"
      >
        {last ? t("landing.storyTop") : t("landing.storyNext")}
        <span className="flex size-6 items-center justify-center rounded-full bg-sun text-sun-foreground">
          {last ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
        </span>
      </button>
    </div>
  );
}
