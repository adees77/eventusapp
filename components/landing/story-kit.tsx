"use client";

/**
 * Building blocks shared by the scroll stories (clients on /, vendors on /for-vendors):
 * the story context, small timing hooks for in-screen sequences, and the pieces screens are made of.
 * Motion: transform + opacity only; reduced motion shows every end state at once.
 */
import { Mic, Star } from "lucide-react";
import { animate, motion } from "motion/react";
import Image from "next/image";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CategoryId, Vendor } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export type Side = 1 | -1; // which side the phone is on (1 = right)

export const EASE = [0.22, 1, 0.36, 1] as const;
export const TYPE_SPEED = 26; // ms per character

/* ─────────────────────────── context & hooks ─────────────────────────── */

export const StoryCtx = createContext<{ reduce: boolean; vendors: Partial<Record<CategoryId, Vendor>> }>({ reduce: false, vendors: {} });

export function useDur() {
  const { reduce } = useContext(StoryCtx);
  return (s: number) => (reduce ? 0 : s);
}
export const useReduce = () => useContext(StoryCtx).reduce;
export const useVendor = (cat: CategoryId) => useContext(StoryCtx).vendors[cat];
export const useVendors = () => useContext(StoryCtx).vendors;

/** Number of moments (seconds since mount) that have passed — drives little in-screen sequences. */
export function useSteps(times: number[]) {
  const reduce = useReduce();
  const [step, setStep] = useState(reduce ? times.length : 0);
  const key = times.join(",");
  useEffect(() => {
    if (reduce) return;
    const ids = key.split(",").map((s, i) => setTimeout(() => setStep(i + 1), Number(s) * 1000));
    return () => ids.forEach(clearTimeout);
  }, [key, reduce]);
  return step;
}

/** Text that types itself out after `start` seconds. */
export function useTyped(text: string, start: number) {
  const reduce = useReduce();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) return;
    let iv: ReturnType<typeof setInterval> | undefined;
    const t0 = setTimeout(() => {
      iv = setInterval(() => setN((c) => (c >= text.length ? c : c + 1)), TYPE_SPEED);
    }, start * 1000);
    return () => {
      clearTimeout(t0);
      if (iv) clearInterval(iv);
    };
  }, [text, start, reduce]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

/** typing time of a request typed by useTyped from 0.35 s, for things that hook onto its end */
export function typingEnd(text: string) {
  return 0.35 + (text.length * TYPE_SPEED) / 1000;
}

export function CountUp({ to, from = 0, delay, duration, format = String }: { to: number; from?: number; delay: number; duration: number; format?: (n: number) => string }) {
  const reduce = useReduce();
  const [v, setV] = useState(reduce ? to : from);
  useEffect(() => {
    if (reduce) return;
    const c = animate(from, to, { duration, delay, ease: EASE, onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [to, from, delay, duration, reduce]);
  return <>{format(v)}</>;
}

export function usePop() {
  const dur = useDur();
  return (delay: number, y = 10) => ({
    initial: { opacity: 0, y: dur(y) },
    animate: { opacity: 1, y: 0 },
    transition: { duration: dur(0.45), ease: EASE, delay: dur(delay) },
  });
}

/* ─────────────────────────── pieces ─────────────────────────── */

export function TypingDots() {
  const reduce = useReduce();
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-current"
          animate={reduce ? { opacity: 0.6 } : { opacity: [0.25, 1, 0.25] }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

export function Cover({ vendor, sizes, className }: { vendor?: Vendor; sizes: string; className?: string }) {
  return (
    <span className={cn("relative block overflow-hidden bg-cream", className)}>
      {vendor?.cover && <Image src={vendor.cover} alt="" fill sizes={sizes} className="object-cover" />}
    </span>
  );
}

/** A photo by URL (a vendor's portfolio shot) */
export function Photo({ src, sizes, className }: { src?: string; sizes: string; className?: string }) {
  return (
    <span className={cn("relative block overflow-hidden bg-cream", className)}>
      {src && <Image src={src} alt="" fill sizes={sizes} className="object-cover" />}
    </span>
  );
}

export function InputBar({ text, active }: { text?: ReactNode; active?: boolean }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-2 rounded-[22px] bg-foreground/[0.045] py-1.5 pr-1.5 pl-4 text-xs text-muted-foreground">
      <span className="leading-snug">{text ?? "…"}</span>
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-white transition-colors", active ? "bg-primary" : "bg-ink")}>
        <Mic className="size-3.5" />
      </span>
    </div>
  );
}

/** Brand detail: «free N of M» dots that light up one by one */
export function Dots({ free, total, delay }: { free: number; total: number; delay: number }) {
  const dur = useDur();
  const reduce = useReduce();
  return (
    <span className="inline-flex gap-[3px]" aria-hidden>
      {Array.from({ length: total }, (_, d) => (
        <motion.span
          key={d}
          className={cn("size-1.5 rounded-full", d < free ? "bg-primary" : "bg-foreground/15")}
          initial={d < free && !reduce ? { scale: 0.2, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: dur(0.3), ease: EASE, delay: dur(delay + d * 0.035) }}
        />
      ))}
    </span>
  );
}

/**
 * A detail floating next to the phone. It flies out from the phone, swings into a slight tilt
 * (so a group never looks machine-aligned) and, with `bob`, idles up and down.
 */
export function Float({
  side,
  inner,
  top,
  out,
  delay,
  bob,
  r,
  children,
  className,
}: {
  side: Side;
  /** on the copy side of the phone instead of the outer side */
  inner?: boolean;
  top: string;
  out: number;
  delay: number;
  /** seconds per gentle idle bob; omit for none */
  bob?: number;
  /** resting tilt in degrees; by default a small one derived from the position */
  r?: number;
  children: ReactNode;
  className?: string;
}) {
  const dur = useDur();
  const reduce = useReduce();
  const right = (side === 1) !== !!inner;
  const dir = right ? 1 : -1; // flies out from the phone towards its edge
  const rot = reduce ? 0 : (r ?? (((parseFloat(top) * 13) % 9) - 4) * 0.6 * dir);
  return (
    <motion.div
      initial={{ opacity: 0, x: dur(-dir * 40), scale: 0.88, rotate: rot * 3 }}
      animate={{ opacity: 1, x: 0, scale: 1, rotate: rot }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: dur(0.15) } }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 170, damping: 18, delay }}
      style={{ top, [right ? "right" : "left"]: out }}
      className="absolute z-10"
    >
      <motion.div
        animate={bob && !reduce ? { y: [0, -7, 0] } : undefined}
        transition={bob && !reduce ? { duration: bob, repeat: Infinity, ease: "easeInOut", delay: delay + 0.6 } : undefined}
        className={cn("flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-xs font-medium whitespace-nowrap text-ink shadow-lift", className)}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export const PHOTO_CARD = "flex-col items-stretch rounded-[20px] p-2";

export function PhotoCard({ vendor, caption, rating }: { vendor?: Vendor; caption: string; rating?: boolean }) {
  return (
    <span className="flex w-[132px] flex-col gap-2">
      <Cover vendor={vendor} sizes="132px" className="h-[150px] w-full rounded-[14px]" />
      <span className="flex items-center justify-between gap-1 px-1 pb-0.5">
        <span className="truncate">{caption}</span>
        {rating && vendor && (
          <span className="flex shrink-0 items-center gap-0.5 text-2xs font-normal text-text-secondary">
            <Star className="size-3 fill-sun text-sun" />
            {vendor.rating.toFixed(1)}
          </span>
        )}
      </span>
    </span>
  );
}
