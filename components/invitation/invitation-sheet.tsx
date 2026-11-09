"use client";

import Image from "next/image";
import type { Invitation } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type SheetData = Pick<
  Invitation,
  "style" | "heading" | "names" | "message" | "date" | "time" | "venue" | "address" | "dressCode" | "photo"
>;

/**
 * The invitation itself, at a fixed 5:7 paper ratio. Every size inside is in
 * container units (cqw), so the same markup renders as a gallery thumbnail,
 * the editor preview and the full guest page without layout drift.
 */
export function InvitationSheet({ data, className }: { data: SheetData; className?: string }) {
  return (
    <div className={cn("@container relative aspect-[5/7] w-full overflow-hidden rounded-[1.6cqw] shadow-lift", className)}>
      {data.style === "classic" && <Classic d={data} />}
      {data.style === "minimal" && <Minimal d={data} />}
      {data.style === "night" && <Night d={data} />}
      {data.style === "arch" && <Arch d={data} />}
      {data.style === "ornament" && <Ornament d={data} />}
      {data.style === "photo" && <Photo d={data} />}
    </div>
  );
}

const NAVY = "#12223d";

function useParts(d: SheetData) {
  const { date, t } = useI18n();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(d.date);
  return {
    day: valid ? date(d.date, "d") : "—",
    monthYear: valid ? date(d.date, "MMMM yyyy") : "",
    full: valid ? date(d.date, "d MMMM yyyy") : "",
    weekday: valid ? date(d.date, "EEEE") : "",
    dressLabel: t("invitations.fields.dressCode"),
  };
}

function Names({ children, className }: { children: string; className?: string }) {
  return <p className={cn("line-clamp-3 font-serif leading-[1.05] [text-wrap:balance]", className)}>{children || " "}</p>;
}

function Message({ children, className }: { children: string; className?: string }) {
  return <p className={cn("line-clamp-4 text-[3.1cqw] leading-[1.5] [text-wrap:pretty]", className)}>{children}</p>;
}

function Place({ d, className }: { d: SheetData; className?: string }) {
  return (
    <div className={cn("text-[3cqw] leading-[1.45]", className)}>
      {d.venue && <p className="line-clamp-1">{d.venue}</p>}
      {d.address && <p className="line-clamp-1 opacity-75">{d.address}</p>}
    </div>
  );
}

/* ── Classic: paper, gold hairline frame, centred ───────────────────── */
function Classic({ d }: { d: SheetData }) {
  const p = useParts(d);
  return (
    <div className="absolute inset-0 bg-[var(--paper)] p-[3cqw] text-foreground">
      <div className="flex h-full flex-col items-center rounded-[0.8cqw] border border-gold/60 px-[8cqw] py-[9cqw] text-center">
        <p className="font-serif text-[4.4cqw] italic text-gold-foreground">{d.heading}</p>
        <Names className="mt-[5cqw] text-[10cqw]">{d.names}</Names>
        <span className="mt-[5cqw] h-px w-[12cqw] bg-gold/70" aria-hidden />
        <Message className="mt-[5cqw] text-text-secondary">{d.message}</Message>
        <div className="mt-auto flex flex-col items-center">
          <div className="font-serif text-[15cqw] leading-none [font-variant-numeric:lining-nums]">{p.day}</div>
          <div className="mt-[1.5cqw] font-serif text-[4.6cqw]">{p.monthYear}</div>
          <div className="mt-[0.5cqw] text-[2.9cqw] text-text-secondary">
            {p.weekday}
            {d.time && ` · ${d.time}`}
          </div>
          <Place d={d} className="mt-[4cqw] text-text-secondary" />
          {d.dressCode && (
            <p className="mt-[3cqw] text-[2.7cqw] text-gold-foreground">
              {p.dressLabel}: {d.dressCode}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Minimal: white, left-aligned, one black rule ───────────────────── */
function Minimal({ d }: { d: SheetData }) {
  const p = useParts(d);
  return (
    <div className="absolute inset-0 flex flex-col bg-white px-[9cqw] py-[10cqw] text-foreground">
      <p className="text-[3.2cqw] text-text-secondary">{d.heading}</p>
      <Names className="mt-[3cqw] font-sans text-[9.5cqw] font-medium tracking-[-0.02em]">{d.names}</Names>
      <Message className="mt-[5cqw] max-w-[70cqw] text-text-secondary">{d.message}</Message>
      <div className="mt-auto">
        <div className="h-px w-full bg-foreground" aria-hidden />
        <div className="mt-[4cqw] grid grid-cols-2 gap-[4cqw] text-[3cqw] leading-[1.45]">
          <div>
            <p className="font-medium">{p.full}</p>
            <p className="text-text-secondary">
              {p.weekday}
              {d.time && `, ${d.time}`}
            </p>
          </div>
          <Place d={d} />
        </div>
        {d.dressCode && <p className="mt-[3cqw] text-[2.7cqw] text-text-secondary">{p.dressLabel}: {d.dressCode}</p>}
      </div>
    </div>
  );
}

/* ── Night: deep navy, gold type, double frame ──────────────────────── */
function Night({ d }: { d: SheetData }) {
  const p = useParts(d);
  return (
    <div className="absolute inset-0 p-[3cqw]" style={{ background: NAVY }}>
      <div className="h-full rounded-[0.8cqw] border border-gold/50 p-[1.2cqw]">
        <div className="flex h-full flex-col items-center rounded-[0.5cqw] border border-gold/25 px-[8cqw] py-[9cqw] text-center text-white">
          <p className="text-[3cqw] text-gold">{d.heading}</p>
          <Names className="mt-[5cqw] text-[10.5cqw] text-gold">{d.names}</Names>
          <Message className="mt-[6cqw] text-white/70">{d.message}</Message>
          <div className="mt-auto flex w-full flex-col items-center">
            <div className="flex items-center gap-[4cqw] font-serif text-gold">
              <span className="text-[4cqw] capitalize">{p.weekday}</span>
              <span className="text-[13cqw] leading-none [font-variant-numeric:lining-nums]">{p.day}</span>
              <span className="text-[4cqw]">{d.time}</span>
            </div>
            <div className="mt-[1.5cqw] font-serif text-[4.4cqw] text-gold">{p.monthYear}</div>
            <Place d={d} className="mt-[5cqw] text-white/70" />
            {d.dressCode && <p className="mt-[3cqw] text-[2.7cqw] text-gold/80">{p.dressLabel}: {d.dressCode}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Arch: paper, a single gold arch around the text ────────────────── */
function Arch({ d }: { d: SheetData }) {
  const p = useParts(d);
  return (
    <div className="absolute inset-0 bg-[var(--paper)] px-[7cqw] pt-[7cqw] pb-[6cqw] text-foreground">
      <div className="flex h-full flex-col items-center rounded-t-[50cqw] border border-gold/70 px-[8cqw] pt-[20cqw] pb-[7cqw] text-center">
        <p className="font-serif text-[4.4cqw] italic text-gold-foreground">{d.heading}</p>
        <Names className="mt-[4cqw] text-[10cqw]">{d.names}</Names>
        <Message className="mt-[5cqw] text-text-secondary">{d.message}</Message>
        <div className="mt-auto">
          <div className="font-serif text-[6cqw] [font-variant-numeric:lining-nums]">{p.full}</div>
          <div className="mt-[0.5cqw] text-[2.9cqw] text-text-secondary">
            {p.weekday}
            {d.time && ` · ${d.time}`}
          </div>
          <Place d={d} className="mt-[3.5cqw] text-text-secondary" />
          {d.dressCode && <p className="mt-[2.5cqw] text-[2.7cqw] text-gold-foreground">{p.dressLabel}: {d.dressCode}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Ornament: paper with a stepped-diamond border in brand blue ────── */
function Ornament({ d }: { d: SheetData }) {
  const p = useParts(d);
  return (
    <div className="absolute inset-0 bg-[var(--paper)] text-foreground">
      <svg className="absolute inset-0 size-full text-primary" viewBox="0 0 500 700" preserveAspectRatio="none" aria-hidden>
        <defs>
          <pattern id="orn-band" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M10 2 L18 10 L10 18 L2 10 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10 7 L13 10 L10 13 L7 10 Z" fill="currentColor" />
          </pattern>
        </defs>
        <path fillRule="evenodd" fill="url(#orn-band)" d="M16 16 H484 V684 H16 Z M36 36 V664 H464 V36 Z" />
        <rect x="12" y="12" width="476" height="676" fill="none" stroke="currentColor" strokeWidth="1" />
        <rect x="40" y="40" width="420" height="620" fill="none" stroke="var(--gold)" strokeWidth="1" />
      </svg>
      <div className="relative flex h-full flex-col items-center px-[14cqw] py-[15cqw] text-center">
        <p className="font-serif text-[5cqw] text-primary">{d.heading}</p>
        <Names className="mt-[4cqw] text-[10cqw]">{d.names}</Names>
        <svg className="mt-[4cqw] h-[3cqw] w-[20cqw] text-gold" viewBox="0 0 80 12" aria-hidden>
          <path d="M0 6 H30 M50 6 H80" stroke="currentColor" strokeWidth="1" />
          <path d="M40 0 L46 6 L40 12 L34 6 Z" fill="currentColor" />
        </svg>
        <Message className="mt-[4cqw] text-text-secondary">{d.message}</Message>
        <div className="mt-auto">
          <div className="font-serif text-[6cqw] [font-variant-numeric:lining-nums]">{p.full}</div>
          <div className="mt-[0.5cqw] text-[2.9cqw] text-text-secondary">
            {p.weekday}
            {d.time && ` · ${d.time}`}
          </div>
          <Place d={d} className="mt-[3cqw] text-text-secondary" />
          {d.dressCode && <p className="mt-[2.5cqw] text-[2.7cqw] text-primary">{p.dressLabel}: {d.dressCode}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Photo: picture on top, text block below ────────────────────────── */
function Photo({ d }: { d: SheetData }) {
  const p = useParts(d);
  return (
    <div className="absolute inset-0 flex flex-col bg-white text-foreground">
      <div className="relative h-[46%] shrink-0 bg-muted">
        {d.photo && <Image src={d.photo} alt="" fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />}
      </div>
      <div className="flex flex-1 flex-col items-center px-[9cqw] pt-[7cqw] pb-[7cqw] text-center">
        <p className="font-serif text-[4.4cqw] italic text-gold-foreground">{d.heading}</p>
        <Names className="mt-[2cqw] text-[9cqw]">{d.names}</Names>
        <Message className="mt-[3cqw] line-clamp-3 text-text-secondary">{d.message}</Message>
        <div className="mt-auto flex items-center gap-[3cqw] text-[3cqw]">
          <span className="font-serif text-[5cqw] [font-variant-numeric:lining-nums]">{p.full}</span>
          {d.time && <span className="text-text-secondary">{d.time}</span>}
        </div>
        <Place d={d} className="mt-[1.5cqw] text-text-secondary" />
      </div>
    </div>
  );
}
