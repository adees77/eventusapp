"use client";

import { differenceInSeconds, parseISO } from "date-fns";
import { MapPin, Minus, Phone, Plus } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { submitRsvp } from "@/lib/data/actions";
import type { BlockStyle, FontKey, Invitation, InvitationBlock, InvitationTheme } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Renders an invitation design as a web page. The same component draws the
 * editor canvas (mode="edit": blocks are selectable, texts editable in place)
 * and the public guest page (mode="live": countdown ticks, RSVP submits).
 */

export type PageData = Pick<Invitation, "id" | "design" | "date" | "time" | "venue" | "address" | "names" | "contact">;

const FONT: Record<FontKey, string> = {
  serif: "var(--font-cormorant), Georgia, serif",
  sans: "var(--font-golos), system-ui, sans-serif",
  script: "var(--font-script), var(--font-cormorant), cursive",
};

const SIZE: Record<NonNullable<BlockStyle["size"]>, string> = {
  s: "text-[15px] leading-relaxed",
  m: "text-[17px] leading-relaxed",
  l: "text-[22px] leading-snug",
  xl: "text-[30px] leading-tight",
};

export function themeVars(theme: InvitationTheme): React.CSSProperties {
  return {
    "--inv-bg": theme.bg,
    "--inv-ink": theme.ink,
    "--inv-muted": theme.muted,
    "--inv-accent": theme.accent,
    "--inv-surface": theme.surface,
    "--inv-display": FONT[theme.display],
    "--inv-body": FONT[theme.body],
    background: theme.bg,
    color: theme.ink,
    fontFamily: FONT[theme.body],
  } as React.CSSProperties;
}

export interface EditApi {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEditProp: (blockId: string, prop: string, value: string) => void;
}

export function InvitationPage({
  data,
  mode = "live",
  edit,
  guest,
  className,
}: {
  data: PageData;
  mode?: "live" | "edit" | "thumb";
  edit?: EditApi;
  guest?: { id: string; name: string } | null;
  className?: string;
}) {
  const { design } = data;
  return (
    <div className={cn("@container relative min-h-full w-full overflow-hidden", className)} style={themeVars(design.theme)}>
      {design.blocks
        .filter((b) => !b.style.hidden || mode === "edit")
        .map((b, i) => (
          <BlockFrame key={b.id} block={b} mode={mode} edit={edit}>
            <Block block={b} data={data} mode={mode} edit={edit} guest={guest} first={i === 0} />
          </BlockFrame>
        ))}
    </div>
  );
}

function BlockFrame({ block, mode, edit, children }: { block: InvitationBlock; mode: string; edit?: EditApi; children: React.ReactNode }) {
  const s = block.style;
  const style: React.CSSProperties = {
    paddingTop: s.padY ?? undefined,
    paddingBottom: s.padY ?? undefined,
    background: s.bg || undefined,
    color: s.color || undefined,
    textAlign: s.align ?? "center",
  };
  if (mode !== "edit" || !edit) {
    return (
      <section style={style} className={cn("relative px-[7cqw]", block.type !== "cover" && block.style.padY === undefined && "py-[7cqw]")}>
        {children}
      </section>
    );
  }
  const selected = edit.selectedId === block.id;
  return (
    <section
      style={style}
      data-block={block.id}
      onClick={(e) => {
        e.stopPropagation();
        edit.onSelect(block.id);
      }}
      className={cn(
        "relative cursor-default px-[7cqw] outline-offset-[-2px] transition-[outline-color]",
        block.type !== "cover" && block.style.padY === undefined && "py-[7cqw]",
        selected ? "outline-2 outline-[#2A5FA5] outline-solid" : "outline-1 outline-transparent outline-dashed hover:outline-[#2A5FA5]/50",
        block.style.hidden && "opacity-35",
      )}
    >
      {selected && (
        <span className="absolute top-0 left-0 z-10 rounded-br-md bg-[#2A5FA5] px-1.5 py-0.5 font-sans text-[10px] text-white">
          {block.type}
        </span>
      )}
      {children}
    </section>
  );
}

/** Text that is editable in place on the canvas */
function T({
  block,
  prop,
  edit,
  mode,
  as: Tag = "p",
  className,
  style,
  placeholder,
}: {
  block: InvitationBlock;
  prop: string;
  edit?: EditApi;
  mode: string;
  as?: "p" | "h1" | "h2" | "div" | "span";
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  const value = block.props[prop] ?? "";
  const ref = useRef<HTMLElement>(null);
  const editing = mode === "edit" && edit?.selectedId === block.id;
  // While editing, the DOM owns the text (React renders no children, so the caret never jumps).
  // Sync it from the store when it changes elsewhere (inspector, undo) and the field isn't focused.
  useEffect(() => {
    const el = ref.current;
    if (editing && el && document.activeElement !== el && el.innerText !== value) el.innerText = value;
  }, [value, editing]);
  if (!value && mode !== "edit") return null;
  if (editing) {
    return (
      <Tag
        key="editing"
        ref={ref as never}
        className={cn(
          "cursor-text whitespace-pre-line outline-none [text-wrap:balance] empty:before:opacity-40 empty:before:content-[attr(data-placeholder)]",
          className,
        )}
        style={style}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => edit?.onEditProp(block.id, prop, (e.target as HTMLElement).innerText)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") (e.target as HTMLElement).blur();
        }}
      />
    );
  }
  return (
    <Tag key="view" className={cn("whitespace-pre-line [text-wrap:balance]", !value && "opacity-40", className)} style={style}>
      {value || placeholder}
    </Tag>
  );
}

function blockText(block: InvitationBlock, base?: string) {
  const s = block.style;
  return cn(s.size ? SIZE[s.size] : base, s.italic && "italic");
}

function fontOf(block: InvitationBlock, fallback: "display" | "body"): React.CSSProperties {
  return { fontFamily: block.style.font ? FONT[block.style.font] : `var(--inv-${fallback})` };
}

function Block({
  block,
  data,
  mode,
  edit,
  guest,
  first,
}: {
  block: InvitationBlock;
  data: PageData;
  mode: "live" | "edit" | "thumb";
  edit?: EditApi;
  guest?: { id: string; name: string } | null;
  first: boolean;
}) {
  const { t, date } = useI18n();
  const p = block.props;
  const tp = { block, edit, mode };
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(data.date);

  switch (block.type) {
    case "cover":
      return <Cover {...tp} data={data} guest={guest} first={first} />;
    case "heading":
      return (
        <T {...tp} prop="text" as="h2" className={blockText(block, SIZE.xl)} style={fontOf(block, "display")} placeholder="Заголовок" />
      );
    case "text":
      return (
        <T
          {...tp}
          prop="text"
          className={cn("mx-auto max-w-[34em]", blockText(block, SIZE.m), !block.style.color && "text-[var(--inv-ink)]")}
          style={fontOf(block, "body")}
          placeholder="Текст"
        />
      );
    case "image":
      return (
        <figure>
          <ImageBox src={block.images?.[0]} ratio="4/5" />
          <T {...tp} prop="caption" as="div" className="mt-3 text-[14px] text-[var(--inv-muted)] italic" placeholder="Подпись" />
        </figure>
      );
    case "gallery":
      return (
        <div>
          <T {...tp} prop="title" as="h2" className={blockText(block, SIZE.l)} style={fontOf(block, "display")} placeholder="Галерея" />
          <div className="mt-[5cqw] grid grid-cols-2 gap-[2cqw]">
            {(block.images?.length ? block.images : [undefined, undefined, undefined, undefined]).slice(0, 6).map((src, i) => (
              <ImageBox key={`${src}-${i}`} src={src} ratio={i % 3 === 0 ? "3/4" : "1/1"} />
            ))}
          </div>
        </div>
      );
    case "divider":
      return <Divider variant={p.variant} />;
    case "spacer":
      return <div style={{ height: block.style.padY ?? 32 }} aria-hidden />;
    case "date":
      return (
        <div className="flex flex-col items-center" style={{ alignItems: alignItems(block) }}>
          <T
            {...tp}
            prop="title"
            as="div"
            className="mb-[3cqw] text-[13px] tracking-[0.04em] text-[var(--inv-muted)]"
            placeholder="Когда"
          />
          <div className="font-[family-name:var(--inv-display)] text-[clamp(64px,24cqw,120px)] leading-none text-[var(--inv-accent)] [font-variant-numeric:lining-nums]">
            {validDate ? date(data.date, "d") : "—"}
          </div>
          <div className="mt-2 font-[family-name:var(--inv-display)] text-[24px]">{validDate ? date(data.date, "MMMM yyyy") : ""}</div>
          <div className="mt-1 text-[14px] text-[var(--inv-muted)]">
            {validDate ? date(data.date, "EEEE") : ""}
            {data.time && ` · ${data.time}`}
          </div>
        </div>
      );
    case "countdown":
      return (
        <div>
          <T
            {...tp}
            prop="title"
            as="div"
            className="mb-[4cqw] text-[13px] tracking-[0.04em] text-[var(--inv-muted)]"
            placeholder="До праздника"
          />
          <Countdown date={data.date} time={data.time} live={mode === "live"} />
        </div>
      );
    case "venue": {
      const q = encodeURIComponent([data.venue, data.address].filter(Boolean).join(", "));
      return (
        <div className="flex flex-col items-center" style={{ alignItems: alignItems(block) }}>
          <T
            {...tp}
            prop="title"
            as="div"
            className="mb-[3cqw] text-[13px] tracking-[0.04em] text-[var(--inv-muted)]"
            placeholder="Место"
          />
          <MapPin className="size-5 text-[var(--inv-accent)]" strokeWidth={1.5} />
          <div className="mt-2 font-[family-name:var(--inv-display)] text-[26px] leading-tight">
            {data.venue || (mode === "edit" ? "Ресторан" : "")}
          </div>
          {data.address && <div className="mt-1 text-[14px] text-[var(--inv-muted)]">{data.address}</div>}
          {q && (
            <div className="mt-[5cqw] flex flex-wrap justify-center gap-2">
              <MapLink href={`https://2gis.kg/search/${q}`} label="2GIS" mode={mode} />
              <MapLink href={`https://www.google.com/maps/search/?api=1&query=${q}`} label="Google Maps" mode={mode} />
            </div>
          )}
        </div>
      );
    }
    case "schedule":
      return (
        <div>
          <T {...tp} prop="title" as="h2" className={blockText(block, SIZE.l)} style={fontOf(block, "display")} placeholder="Программа" />
          <ol className="mx-auto mt-[5cqw] flex max-w-[26em] flex-col">
            {(block.items ?? []).map((it, i, all) => (
              <li key={it.id} className="grid grid-cols-[4.5em_1px_1fr] gap-x-4 text-left">
                <span className="pt-0.5 text-right font-[family-name:var(--inv-display)] text-[20px] text-[var(--inv-accent)] tabular-nums">
                  {it.time}
                </span>
                <span className="relative bg-[var(--inv-accent)]/30">
                  <span className="absolute top-2.5 -left-[3px] size-[7px] rounded-full bg-[var(--inv-accent)]" />
                </span>
                <span className={cn("pt-1 text-[16px]", i < all.length - 1 && "pb-6")}>
                  {it.title}
                  {it.text && <span className="mt-0.5 block text-[13px] text-[var(--inv-muted)]">{it.text}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      );
    case "dresscode": {
      const colors = (p.colors ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
      return (
        <div className="flex flex-col items-center" style={{ alignItems: alignItems(block) }}>
          <T {...tp} prop="title" as="div" className="text-[13px] tracking-[0.04em] text-[var(--inv-muted)]" placeholder="Дресс-код" />
          <T {...tp} prop="text" as="div" className="mt-2 font-[family-name:var(--inv-display)] text-[24px]" placeholder="Вечерний" />
          {colors.length > 0 && (
            <div className="mt-4 flex gap-2">
              {colors.map((c) => (
                <span key={c} className="size-8 rounded-full ring-1 ring-black/10" style={{ background: c }} title={c} />
              ))}
            </div>
          )}
        </div>
      );
    }
    case "contacts":
      return (
        <div className="flex flex-col items-center" style={{ alignItems: alignItems(block) }}>
          <T {...tp} prop="title" as="div" className="text-[13px] tracking-[0.04em] text-[var(--inv-muted)]" placeholder="Вопросы" />
          <T {...tp} prop="name" as="div" className="mt-2 text-[17px]" placeholder="Имя организатора" />
          {(p.phone || data.contact) && (
            <a
              href={mode === "live" ? `tel:${(p.phone || data.contact || "").replace(/[^\d+]/g, "")}` : undefined}
              className="mt-2 inline-flex items-center gap-2 text-[17px] text-[var(--inv-accent)] tabular-nums"
            >
              <Phone className="size-4" strokeWidth={1.5} />
              {p.phone || data.contact}
            </a>
          )}
        </div>
      );
    case "rsvp":
      return <Rsvp block={block} data={data} mode={mode} edit={edit} guest={guest} t={t} />;
  }
}

function alignItems(b: InvitationBlock) {
  return b.style.align === "left" ? "flex-start" : b.style.align === "right" ? "flex-end" : "center";
}

function MapLink({ href, label, mode }: { href: string; label: string; mode: string }) {
  return (
    <a
      href={mode === "live" ? href : undefined}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-10 items-center rounded-full border border-[var(--inv-accent)]/50 px-5 text-[14px] text-[var(--inv-ink)] transition-colors hover:bg-[var(--inv-accent)]/10"
    >
      {label}
    </a>
  );
}

function ImageBox({ src, ratio }: { src?: string; ratio: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-[2cqw] bg-[var(--inv-ink)]/[0.06]" style={{ aspectRatio: ratio }}>
      {src && <Image src={src} alt="" fill sizes="(min-width: 768px) 480px, 90vw" className="object-cover" />}
    </div>
  );
}

function Divider({ variant }: { variant?: string }) {
  if (variant === "ornament")
    return (
      <svg viewBox="0 0 120 12" className="mx-auto h-3 w-32 text-[var(--inv-accent)]" aria-hidden>
        <path d="M0 6h50M70 6h50" stroke="currentColor" strokeWidth="0.8" />
        <path d="M60 1l5 5-5 5-5-5z" fill="none" stroke="currentColor" strokeWidth="0.8" />
      </svg>
    );
  if (variant === "dots")
    return (
      <div className="flex justify-center gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1 rounded-full bg-[var(--inv-accent)]" />
        ))}
      </div>
    );
  return <span className="mx-auto block h-px w-16 bg-[var(--inv-accent)]/70" aria-hidden />;
}

function Cover({
  block,
  data,
  mode,
  edit,
  guest,
  first,
}: {
  block: InvitationBlock;
  data: PageData;
  mode: "live" | "edit" | "thumb";
  edit?: EditApi;
  guest?: { id: string; name: string } | null;
  first: boolean;
}) {
  const { t, date } = useI18n();
  const variant = block.props.variant ?? "frame";
  const photo = block.images?.[0];
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(data.date);
  const tp = { block, edit, mode };
  const greeting = guest && <p className="mb-[4cqw] text-[14px] text-[var(--inv-muted)]">{t("inv.dear", { name: guest.name })}</p>;
  const title = (
    <T
      {...tp}
      prop="title"
      as="h1"
      className={cn("text-[clamp(40px,14cqw,88px)] leading-[1.02]", block.style.italic && "italic")}
      style={fontOf(block, "display")}
      placeholder="Айгерим и Тимур"
    />
  );
  const kicker = (
    <T
      {...tp}
      prop="kicker"
      as="div"
      className="text-[clamp(15px,4.4cqw,20px)] text-[var(--inv-accent)] italic"
      style={{ fontFamily: "var(--inv-display)" }}
      placeholder="Приглашение на свадьбу"
    />
  );
  const dateLine = validDate && (
    <div className="text-[14px] tracking-[0.04em] text-[var(--inv-muted)] tabular-nums">
      {date(data.date, "d MMMM yyyy")}
      {data.time && ` · ${data.time}`}
    </div>
  );
  const minH = mode === "thumb" ? "min-h-[140cqw]" : "min-h-[150cqw] @[640px]:min-h-[min(92vh,820px)]";

  if (variant === "photo") {
    return (
      <div
        className={cn("relative -mx-[7cqw] flex flex-col items-center justify-end overflow-hidden px-[7cqw] pb-[12cqw] text-white", minH)}
      >
        {photo ? (
          <Image src={photo} alt="" fill loading={first && mode === "live" ? "eager" : "lazy"} sizes="100vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[var(--inv-ink)]/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
        <div className="relative flex flex-col items-center gap-[4cqw] [&_*]:!text-white">
          {greeting}
          {kicker}
          {title}
          {dateLine}
        </div>
      </div>
    );
  }

  const inner = (
    <div className="flex flex-col items-center gap-[5cqw]">
      {greeting}
      {kicker}
      {title}
      <Divider variant={variant === "ornament" ? "ornament" : "line"} />
      {dateLine}
    </div>
  );

  if (variant === "arch") {
    return (
      <div className={cn("flex items-center justify-center py-[10cqw]", minH)}>
        <div className="flex w-full max-w-[520px] flex-col items-center rounded-t-[999px] border border-[var(--inv-accent)]/60 px-[8cqw] pt-[24cqw] pb-[14cqw]">
          {inner}
        </div>
      </div>
    );
  }
  if (variant === "frame") {
    return (
      <div className={cn("flex items-center py-[7cqw]", minH)}>
        <div className="flex min-h-[inherit] w-full flex-col items-center justify-center rounded-[1cqw] border border-[var(--inv-accent)]/60 px-[6cqw] py-[14cqw] outline outline-offset-[-2.4cqw] outline-[var(--inv-accent)]/25">
          {inner}
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-[16cqw]",
        minH,
        variant === "ornament" && "bg-[radial-gradient(circle_at_50%_40%,var(--inv-surface),transparent_70%)]",
      )}
    >
      {inner}
    </div>
  );
}

function Countdown({ date, time, live }: { date: string; time: string; live: boolean }) {
  const { t } = useI18n();
  const target = /^\d{4}-\d{2}-\d{2}$/.test(date) ? parseISO(`${date}T${/^\d{2}:\d{2}$/.test(time) ? time : "18:00"}:00`) : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);
  const left = target ? Math.max(0, differenceInSeconds(target, now)) : 0;
  const parts = [
    { v: Math.floor(left / 86400), k: "days" },
    { v: Math.floor((left % 86400) / 3600), k: "hours" },
    { v: Math.floor((left % 3600) / 60), k: "minutes" },
    { v: left % 60, k: "seconds" },
  ] as const;
  return (
    <div className="mx-auto grid max-w-[26em] grid-cols-4 gap-[2.5cqw]">
      {parts.map((p) => (
        <div key={p.k} className="rounded-[2cqw] bg-[var(--inv-surface)] py-[4cqw] ring-1 ring-[var(--inv-ink)]/[0.06]">
          <div className="font-[family-name:var(--inv-display)] text-[clamp(26px,8cqw,44px)] leading-none tabular-nums">
            {String(p.v).padStart(2, "0")}
          </div>
          <div className="mt-1.5 text-[11px] text-[var(--inv-muted)]">{t(`inv.${p.k}`)}</div>
        </div>
      ))}
    </div>
  );
}

function Rsvp({
  block,
  data,
  mode,
  edit,
  guest,
  t,
}: {
  block: InvitationBlock;
  data: PageData;
  mode: string;
  edit?: EditApi;
  guest?: { id: string; name: string } | null;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const [name, setName] = useState(guest?.name ?? "");
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guests, setGuests] = useState(1);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const live = mode === "live";
  const valid = name.trim().length > 1 && attending !== null;
  const field =
    "h-11 w-full rounded-[10px] border border-[var(--inv-ink)]/15 bg-[var(--inv-bg)] px-3.5 text-[15px] text-[var(--inv-ink)] outline-none placeholder:text-[var(--inv-muted)]/70 focus:border-[var(--inv-accent)]";

  return (
    <div
      className="mx-auto max-w-[30em] rounded-[3cqw] bg-[var(--inv-surface)] p-[6cqw] text-left ring-1 ring-[var(--inv-ink)]/[0.06] @[640px]:p-8"
      id="rsvp"
    >
      <T
        block={block}
        prop="title"
        edit={edit}
        mode={mode}
        as="h2"
        className="text-center text-[clamp(24px,7cqw,34px)] leading-tight"
        style={fontOf(block, "display")}
        placeholder="Подтвердите присутствие"
      />
      <T
        block={block}
        prop="text"
        edit={edit}
        mode={mode}
        as="p"
        className="mt-2 text-center text-[14px] text-[var(--inv-muted)]"
        placeholder="Ответьте до…"
      />
      {sent ? (
        <div className="mt-6 text-center">
          <p className="font-[family-name:var(--inv-display)] text-[24px]">{attending ? t("inv.thanksYes") : t("inv.thanksNo")}</p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-2 text-[14px] text-[var(--inv-accent)] underline-offset-4 hover:underline"
          >
            {t("invitations.rsvp.change")}
          </button>
        </div>
      ) : (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!live || !valid) return;
            submitRsvp(data.id, { name, attending: attending!, guests, note, guestId: guest?.id });
            setSent(true);
          }}
        >
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("invitations.rsvp.title")}>
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                role="radio"
                aria-checked={attending === v}
                onClick={() => setAttending(v)}
                className={cn(
                  "h-11 rounded-[10px] border text-[15px] transition-colors",
                  attending === v
                    ? "border-[var(--inv-accent)] bg-[var(--inv-accent)]/15 text-[var(--inv-ink)] ring-1 ring-[var(--inv-accent)]"
                    : "border-[var(--inv-ink)]/15 text-[var(--inv-muted)] hover:text-[var(--inv-ink)]",
                )}
              >
                {v ? t("invitations.rsvp.yes") : t("invitations.rsvp.no")}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] text-[var(--inv-muted)]">
            {t("invitations.rsvp.name")}
            <input
              className={field}
              value={name}
              maxLength={80}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              disabled={!live}
            />
          </label>
          {attending && (
            <div className="flex items-center justify-between gap-3 text-[13px] text-[var(--inv-muted)]">
              {t("invitations.rsvp.guests")}
              <div className="flex h-10 items-center rounded-[10px] border border-[var(--inv-ink)]/15">
                <button
                  type="button"
                  className="flex size-10 items-center justify-center disabled:opacity-30"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  disabled={guests <= 1}
                  aria-label="−"
                >
                  <Minus className="size-4" strokeWidth={1.5} />
                </button>
                <span className="w-8 text-center text-[15px] text-[var(--inv-ink)] tabular-nums">{guests}</span>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center disabled:opacity-30"
                  onClick={() => setGuests((g) => Math.min(10, g + 1))}
                  disabled={guests >= 10}
                  aria-label="+"
                >
                  <Plus className="size-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}
          <label className="flex flex-col gap-1.5 text-[13px] text-[var(--inv-muted)]">
            {t("invitations.rsvp.note")}
            <textarea
              className={cn(field, "h-auto resize-none py-2.5")}
              rows={2}
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              disabled={!live}
            />
          </label>
          <button
            type="submit"
            disabled={live && !valid}
            className="h-12 rounded-[10px] bg-[var(--inv-accent)] text-[15px] text-white transition-opacity disabled:opacity-40"
          >
            {t("invitations.rsvp.submit")}
          </button>
        </form>
      )}
    </div>
  );
}
