"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Clock,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Heading,
  Image as ImageIcon,
  Images,
  Layers,
  LayoutTemplate,
  ListOrdered,
  MapPin,
  Minus,
  MoveVertical,
  Phone,
  Plus,
  Redo2,
  Shirt,
  SlidersHorizontal,
  Smartphone,
  Text,
  Trash2,
  Undo2,
  Monitor,
  MailCheck,
  X,
} from "lucide-react";
import NextImage from "next/image";
import { useEffect, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { Field, inputClass, textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { INVITATION_PHOTOS } from "@/lib/data/invitation-templates";
import { updateInvitation } from "@/lib/data/actions";
import { PHOTOS, unsplash } from "@/lib/data/seed/photos";
import type { BlockStyle, BlockType, FontKey, Invitation, InvitationBlock, InvitationDesign, InvitationTheme } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { BLOCK_TYPES, THEMES, blockId, duplicateBlock, moveBlock, newBlock } from "@/lib/invitations/design";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import { InvitationPage } from "../page/invitation-page";
import { useDesignHistory } from "./use-design-history";

const ICON: Record<BlockType, typeof Text> = {
  cover: LayoutTemplate,
  heading: Heading,
  text: Text,
  image: ImageIcon,
  gallery: Images,
  divider: Minus,
  date: CalendarDays,
  countdown: Clock,
  venue: MapPin,
  schedule: ListOrdered,
  dresscode: Shirt,
  contacts: Phone,
  rsvp: MailCheck,
  spacer: MoveVertical,
};

/** Photo library for image blocks: event-ish stock photos */
const LIBRARY = Array.from(
  new Set([
    ...INVITATION_PHOTOS,
    ...[
      ...PHOTOS.decor,
      ...PHOTOS.halls.slice(0, 6),
      ...PHOTOS.tables.slice(0, 4),
      ...PHOTOS.photo.slice(0, 6),
      ...PHOTOS.traditional.slice(0, 3),
    ].map((id) => unsplash(id, 1000, 1250)),
  ]),
);

type Device = "phone" | "desktop";

export function DesignEditor({ inv }: { inv: Invitation }) {
  const { t } = useI18n();
  const actor = useActor();
  const h = useDesignHistory(actor, inv);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("phone");
  const [zoom, setZoom] = useState(1);
  const [sheet, setSheet] = useState<"layers" | "inspector" | null>(null);
  const design = inv.design;
  const selected = design.blocks.find((b) => b.id === selectedId) ?? null;

  const setBlocks = (fn: (b: InvitationBlock[]) => InvitationBlock[], key?: string) =>
    h.apply((d) => ({ ...d, blocks: fn(d.blocks) }), key);
  const patchBlock = (id: string, patch: Partial<InvitationBlock>, key?: string) =>
    setBlocks(
      (bs) =>
        bs.map((b) => (b.id === id ? { ...b, ...patch, props: { ...b.props, ...patch.props }, style: { ...b.style, ...patch.style } } : b)),
      key,
    );
  const setTheme = (patch: Partial<InvitationTheme>, key?: string) => h.apply((d) => ({ ...d, theme: { ...d.theme, ...patch } }), key);

  function add(type: BlockType) {
    const b = newBlock(type, { occasion: inv.occasion });
    const at = selected ? design.blocks.findIndex((x) => x.id === selected.id) + 1 : design.blocks.length;
    setBlocks((bs) => [...bs.slice(0, at), b, ...bs.slice(at)]);
    setSelectedId(b.id);
    setSheet(null);
    requestAnimationFrame(() => document.querySelector(`[data-block="${b.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function remove(id: string) {
    const i = design.blocks.findIndex((b) => b.id === id);
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    setSelectedId(design.blocks[i + 1]?.id ?? design.blocks[i - 1]?.id ?? null);
  }

  // keyboard: undo/redo, delete, duplicate, arrows to move
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.isContentEditable || /input|textarea|select/i.test(target.tagName)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) h.redo();
        else h.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        h.redo();
      } else if (selectedId && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        remove(selectedId);
      } else if (selectedId && mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setBlocks((bs) => duplicateBlock(bs, selectedId));
      } else if (selectedId && e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const i = design.blocks.findIndex((b) => b.id === selectedId);
        setBlocks((bs) => moveBlock(bs, i, i + (e.key === "ArrowUp" ? -1 : 1)));
      } else if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const layers = (
    <LayersPanel
      blocks={design.blocks}
      selectedId={selectedId}
      onSelect={(id) => {
        setSelectedId(id);
        setSheet(null);
        requestAnimationFrame(() =>
          document.querySelector(`[data-block="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
        );
      }}
      onMove={(from, to) => setBlocks((bs) => moveBlock(bs, from, to))}
      onToggle={(id) => {
        const b = design.blocks.find((x) => x.id === id)!;
        patchBlock(id, { style: { hidden: !b.style.hidden } });
      }}
      onAdd={add}
    />
  );
  const inspector = selected ? (
    <BlockInspector
      key={selected.id}
      block={selected}
      inv={inv}
      onPatch={(patch, key) => patchBlock(selected.id, patch, key)}
      onDuplicate={() => setBlocks((bs) => duplicateBlock(bs, selected.id))}
      onRemove={() => remove(selected.id)}
      onClose={() => setSelectedId(null)}
    />
  ) : (
    <PageInspector inv={inv} design={design} onTheme={setTheme} />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-card px-2 md:px-3">
        <Tool label={t("inv.layers")} onClick={() => setSheet("layers")} className="lg:hidden">
          <Layers className="size-4" />
        </Tool>
        <Tool label={t("inv.undo")} onClick={h.undo} disabled={!h.canUndo}>
          <Undo2 className="size-4" />
        </Tool>
        <Tool label={t("inv.redo")} onClick={h.redo} disabled={!h.canRedo}>
          <Redo2 className="size-4" />
        </Tool>
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool label={t("inv.phone")} onClick={() => setDevice("phone")} active={device === "phone"}>
          <Smartphone className="size-4" />
        </Tool>
        <Tool label={t("inv.desktop")} onClick={() => setDevice("desktop")} active={device === "desktop"} className="max-md:hidden">
          <Monitor className="size-4" />
        </Tool>
        <span className="mx-1 h-5 w-px bg-border max-md:hidden" />
        <div className="flex items-center gap-1 max-md:hidden">
          <Tool label="−" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))}>
            <Minus className="size-3.5" />
          </Tool>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="w-12 text-center text-xs text-text-secondary tabular-nums hover:text-foreground"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Tool label="+" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))}>
            <Plus className="size-3.5" />
          </Tool>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{t("invitations.saved")}</span>
          <Tool label={t("inv.properties")} onClick={() => setSheet("inspector")} className="lg:hidden">
            <SlidersHorizontal className="size-4" />
          </Tool>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-card lg:block">{layers}</aside>

        {/* canvas */}
        <div className="min-w-0 flex-1 overflow-auto bg-[#E9ECF1] dark:bg-muted" onClick={() => setSelectedId(null)}>
          <div className="flex min-h-full justify-center px-4 py-8 md:px-10">
            <div
              className={cn(
                "h-fit shrink-0 overflow-hidden bg-white shadow-[0_12px_40px_rgb(17_24_39/0.12)]",
                device === "phone" ? "w-[390px] max-w-full rounded-[28px] ring-8 ring-[#111827]" : "w-[1040px] rounded-xl",
              )}
              style={{ zoom }}
            >
              <InvitationPage
                data={inv}
                mode="edit"
                edit={{
                  selectedId,
                  onSelect: setSelectedId,
                  onEditProp: (id, prop, value) => patchBlock(id, { props: { [prop]: value } }, `${id}:${prop}`),
                }}
              />
            </div>
          </div>
        </div>

        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-border bg-card lg:block">{inspector}</aside>
      </div>

      <Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side={sheet === "layers" ? "left" : "right"} className="w-[min(88vw,320px)] overflow-y-auto p-0 pt-10">
          <SheetTitle className="sr-only">{sheet === "layers" ? t("inv.layers") : t("inv.properties")}</SheetTitle>
          {sheet === "layers" ? layers : inspector}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Tool({
  children,
  label,
  onClick,
  disabled,
  active,
  className,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent",
        active && "bg-secondary text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

// ── Layers ────────────────────────────────────────────────────

function LayersPanel({
  blocks,
  selectedId,
  onSelect,
  onMove,
  onToggle,
  onAdd,
}: {
  blocks: InvitationBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onToggle: (id: string) => void;
  onAdd: (t: BlockType) => void;
}) {
  const { t } = useI18n();
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-2 text-xs text-muted-foreground">{t("inv.layers")}</div>
      <ol className="flex flex-col px-2">
        {blocks.map((b, i) => {
          const Icon = ICON[b.type];
          return (
            <li
              key={b.id}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(i);
              }}
              onDragEnd={() => {
                setDrag(null);
                setOver(null);
              }}
              onDrop={() => {
                if (drag !== null) onMove(drag, i);
                setDrag(null);
                setOver(null);
              }}
              className={cn(
                "group flex h-9 items-center gap-1.5 rounded-lg pr-1 pl-1 text-sm transition-colors",
                selectedId === b.id ? "bg-secondary text-secondary-foreground" : "hover:bg-muted",
                over === i && drag !== null && drag !== i && "ring-1 ring-primary/50",
                b.style.hidden && "text-muted-foreground",
              )}
            >
              <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground/60" />
              <button type="button" onClick={() => onSelect(b.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <span className="truncate">{layerName(b, t)}</span>
              </button>
              <span className="flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <MiniBtn label={t("inv.up")} onClick={() => onMove(i, i - 1)} disabled={i === 0}>
                  <ArrowUp className="size-3" />
                </MiniBtn>
                <MiniBtn label={t("inv.down")} onClick={() => onMove(i, i + 1)} disabled={i === blocks.length - 1}>
                  <ArrowDown className="size-3" />
                </MiniBtn>
              </span>
              <MiniBtn label={b.style.hidden ? t("admin.show") : t("admin.hide")} onClick={() => onToggle(b.id)}>
                {b.style.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5 opacity-0 group-hover:opacity-100" />}
              </MiniBtn>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 border-t border-border px-4 pt-4 pb-2 text-xs text-muted-foreground">{t("inv.addBlock")}</div>
      <div className="grid grid-cols-2 gap-1.5 px-3 pb-6">
        {BLOCK_TYPES.map((type) => {
          const Icon = ICON[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onAdd(type)}
              className="flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-border text-xs text-text-secondary transition-colors hover:border-primary/40 hover:bg-secondary hover:text-secondary-foreground"
            >
              <Icon className="size-4" strokeWidth={1.5} />
              {t(`inv.blocks.${type}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function layerName(b: InvitationBlock, t: ReturnType<typeof useI18n>["t"]) {
  const text = b.props.title || b.props.text || b.props.kicker || b.props.caption;
  const base = t(`inv.blocks.${b.type}`);
  return text && b.type !== "rsvp" ? `${base} · ${text.split("\n")[0].slice(0, 24)}` : base;
}

function MiniBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-20"
    >
      {children}
    </button>
  );
}

// ── Inspector: page ───────────────────────────────────────────

const FONTS: FontKey[] = ["serif", "sans", "script"];
const FONT_FAMILY: Record<FontKey, string> = { serif: "var(--font-cormorant)", sans: "var(--font-golos)", script: "var(--font-script)" };

function PageInspector({
  inv,
  design,
  onTheme,
}: {
  inv: Invitation;
  design: InvitationDesign;
  onTheme: (p: Partial<InvitationTheme>, key?: string) => void;
}) {
  const { t } = useI18n();
  const actor = useActor();
  const set = (patch: Partial<Invitation>) => updateInvitation(actor, inv.id, patch);
  const th = design.theme;
  return (
    <div className="flex flex-col gap-6 p-4">
      <Group title={t("inv.theme")}>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => onTheme({ ...x })}
              aria-pressed={th.id === x.id}
              className={cn(
                "overflow-hidden rounded-lg border text-left",
                th.id === x.id ? "border-primary ring-2 ring-primary/20" : "border-border",
              )}
            >
              <span
                className="flex h-12 flex-col items-center justify-center"
                style={{ background: x.bg, color: x.ink, fontFamily: FONT_FAMILY[x.display] }}
              >
                <span className="text-base leading-none">Aa</span>
                <span className="mt-1 h-px w-6" style={{ background: x.accent }} />
              </span>
              <span className="block truncate px-2 py-1 text-2xs text-text-secondary">{t(`inv.themes.${x.id}` as never)}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title={t("inv.colors")}>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["bg", "inv.cBg"],
              ["ink", "inv.cInk"],
              ["accent", "inv.cAccent"],
              ["surface", "inv.cSurface"],
            ] as const
          ).map(([k, label]) => (
            <ColorField key={k} label={t(label)} value={th[k]} onChange={(v) => onTheme({ [k]: v, id: "custom" }, `theme:${k}`)} />
          ))}
        </div>
      </Group>

      <Group title={t("inv.fonts")}>
        <div className="flex flex-col gap-3">
          {(["display", "body"] as const).map((k) => (
            <div key={k}>
              <div className="mb-1.5 text-xs text-text-secondary">{t(k === "display" ? "inv.fontDisplay" : "inv.fontBody")}</div>
              <div className="grid grid-cols-3 gap-1.5">
                {FONTS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={th[k] === f}
                    onClick={() => onTheme({ [k]: f })}
                    className={cn(
                      "h-10 rounded-lg border text-lg",
                      th[k] === f ? "border-primary bg-secondary" : "border-border hover:bg-muted",
                    )}
                    style={{ fontFamily: FONT_FAMILY[f] }}
                  >
                    Аб
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Group>

      <Group title={t("invitations.details")}>
        <div className="flex flex-col gap-3">
          <Field label={t("invitations.fields.names")}>
            <input value={inv.names} onChange={(e) => set({ names: e.target.value })} className={inputClass} maxLength={80} />
          </Field>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Field label={t("invitations.fields.date")}>
              <DatePicker value={inv.date || null} onChange={(d) => set({ date: d ?? "" })} clearable={false} />
            </Field>
            <Field label={t("invitations.fields.time")}>
              <input type="time" value={inv.time} onChange={(e) => set({ time: e.target.value })} className={inputClass} />
            </Field>
          </div>
          <Field label={t("invitations.fields.venue")}>
            <input value={inv.venue} onChange={(e) => set({ venue: e.target.value })} className={inputClass} maxLength={80} />
          </Field>
          <Field label={t("invitations.fields.address")}>
            <input value={inv.address} onChange={(e) => set({ address: e.target.value })} className={inputClass} maxLength={120} />
          </Field>
          <Field label={t("invitations.fields.contact")}>
            <input
              value={inv.contact ?? ""}
              onChange={(e) => set({ contact: e.target.value })}
              className={inputClass}
              maxLength={40}
              inputMode="tel"
            />
          </Field>
        </div>
      </Group>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("inv.hint")}</p>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-border px-2 text-xs">
      <span className="relative size-6 shrink-0 overflow-hidden rounded-md ring-1 ring-black/10" style={{ background: value }}>
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={label}
        />
      </span>
      <span className="min-w-0 flex-1 truncate text-text-secondary">{label}</span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-xs text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

// ── Inspector: block ──────────────────────────────────────────

const TEXT_PROPS: Partial<Record<BlockType, string[]>> = {
  cover: ["kicker", "title"],
  heading: ["text"],
  text: ["text"],
  image: ["caption"],
  gallery: ["title"],
  date: ["title"],
  countdown: ["title"],
  venue: ["title"],
  schedule: ["title"],
  dresscode: ["title", "text", "colors"],
  contacts: ["title", "name", "phone"],
  rsvp: ["title", "text"],
};

function BlockInspector({
  block,
  inv,
  onPatch,
  onDuplicate,
  onRemove,
  onClose,
}: {
  block: InvitationBlock;
  inv: Invitation;
  onPatch: (p: Partial<InvitationBlock>, key?: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const s = block.style;
  const setStyle = (patch: Partial<BlockStyle>, key?: string) => onPatch({ style: patch }, key);
  const Icon = ICON[block.type];
  const wantsImages = block.type === "cover" ? block.props.variant === "photo" : block.type === "image" || block.type === "gallery";
  const multi = block.type === "gallery";

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" strokeWidth={1.5} />
        <span className="flex-1 text-sm font-medium">{t(`inv.blocks.${block.type}`)}</span>
        <MiniBtn label={t("inv.duplicate")} onClick={onDuplicate}>
          <Copy className="size-3.5" />
        </MiniBtn>
        <MiniBtn label={t("inv.delete")} onClick={onRemove}>
          <Trash2 className="size-3.5" />
        </MiniBtn>
        <MiniBtn label={t("common.close")} onClick={onClose}>
          <X className="size-3.5" />
        </MiniBtn>
      </div>

      {block.type === "cover" && (
        <Group title={t("inv.coverStyle")}>
          <div className="grid grid-cols-3 gap-1.5">
            {(["frame", "plain", "arch", "ornament", "photo"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={block.props.variant === v}
                onClick={() =>
                  onPatch({ props: { variant: v }, images: v === "photo" && !block.images?.length ? [LIBRARY[0]] : block.images })
                }
                className={cn(
                  "h-9 rounded-lg border text-xs",
                  block.props.variant === v ? "border-primary bg-secondary" : "border-border hover:bg-muted",
                )}
              >
                {t(`inv.cover.${v}`)}
              </button>
            ))}
          </div>
        </Group>
      )}

      {block.type === "divider" && (
        <Group title={t("inv.dividerStyle")}>
          <div className="grid grid-cols-3 gap-1.5">
            {(["line", "ornament", "dots"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={(block.props.variant ?? "line") === v}
                onClick={() => onPatch({ props: { variant: v } })}
                className={cn(
                  "h-9 rounded-lg border text-xs",
                  (block.props.variant ?? "line") === v ? "border-primary bg-secondary" : "border-border hover:bg-muted",
                )}
              >
                {t(`inv.divider.${v}`)}
              </button>
            ))}
          </div>
        </Group>
      )}

      {TEXT_PROPS[block.type] && (
        <Group title={t("invitations.text")}>
          <div className="flex flex-col gap-3">
            {TEXT_PROPS[block.type]!.map((prop) => (
              <Field key={prop} label={t(`inv.props.${prop}` as never)}>
                {prop === "text" && block.type !== "dresscode" ? (
                  <textarea
                    value={block.props[prop] ?? ""}
                    onChange={(e) => onPatch({ props: { [prop]: e.target.value } }, `${block.id}:${prop}`)}
                    rows={4}
                    className={textareaClass}
                  />
                ) : (
                  <input
                    value={block.props[prop] ?? ""}
                    onChange={(e) => onPatch({ props: { [prop]: e.target.value } }, `${block.id}:${prop}`)}
                    className={inputClass}
                  />
                )}
              </Field>
            ))}
          </div>
        </Group>
      )}

      {block.type === "schedule" && <ScheduleEditor block={block} onPatch={onPatch} />}

      {(block.type === "date" || block.type === "countdown" || block.type === "venue") && (
        <p className="rounded-lg bg-muted px-3 py-2.5 text-xs leading-relaxed text-text-secondary">{t("inv.factsHint")}</p>
      )}

      {wantsImages && (
        <Group title={multi ? t("inv.photos") : t("invitations.photoLabel")}>
          <div className="grid grid-cols-4 gap-1.5">
            {LIBRARY.map((src) => {
              const on = block.images?.includes(src);
              return (
                <button
                  key={src}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    onPatch({
                      images: multi ? (on ? block.images!.filter((x) => x !== src) : [...(block.images ?? []), src].slice(0, 6)) : [src],
                    })
                  }
                  className={cn("relative aspect-square overflow-hidden rounded-md bg-muted ring-offset-1", on && "ring-2 ring-primary")}
                >
                  <NextImage src={src} alt="" fill sizes="64px" className="object-cover" />
                </button>
              );
            })}
          </div>
        </Group>
      )}

      <Group title={t("inv.styleTitle")}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t("inv.align")}>
            {(
              [
                ["left", AlignLeft],
                ["center", AlignCenter],
                ["right", AlignRight],
              ] as const
            ).map(([a, I]) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={(s.align ?? "center") === a}
                onClick={() => setStyle({ align: a })}
                className={cn(
                  "flex h-9 items-center justify-center rounded-lg border",
                  (s.align ?? "center") === a ? "border-primary bg-secondary text-primary" : "border-border hover:bg-muted",
                )}
                aria-label={a}
              >
                <I className="size-4" />
              </button>
            ))}
          </div>
          {block.type !== "spacer" && block.type !== "divider" && (
            <div className="grid grid-cols-4 gap-1.5">
              {(["s", "m", "l", "xl"] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  aria-pressed={s.size === z}
                  onClick={() => setStyle({ size: s.size === z ? undefined : z })}
                  className={cn(
                    "h-9 rounded-lg border text-xs uppercase",
                    s.size === z ? "border-primary bg-secondary" : "border-border hover:bg-muted",
                  )}
                >
                  {z}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-4 gap-1.5">
            {FONTS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={s.font === f}
                onClick={() => setStyle({ font: s.font === f ? undefined : f })}
                className={cn(
                  "h-9 rounded-lg border text-base",
                  s.font === f ? "border-primary bg-secondary" : "border-border hover:bg-muted",
                )}
                style={{ fontFamily: FONT_FAMILY[f] }}
              >
                Аб
              </button>
            ))}
            <button
              type="button"
              aria-pressed={!!s.italic}
              onClick={() => setStyle({ italic: !s.italic })}
              className={cn(
                "h-9 rounded-lg border font-serif text-base italic",
                s.italic ? "border-primary bg-secondary" : "border-border hover:bg-muted",
              )}
            >
              I
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label={t("inv.cInk")}
              value={s.color || inv.design.theme.ink}
              onChange={(v) => setStyle({ color: v }, `${block.id}:color`)}
            />
            <ColorField label={t("inv.cBg")} value={s.bg || inv.design.theme.bg} onChange={(v) => setStyle({ bg: v }, `${block.id}:bg`)} />
          </div>
          {(s.color || s.bg) && (
            <button
              type="button"
              className="self-start text-xs text-primary hover:underline"
              onClick={() => setStyle({ color: undefined, bg: undefined })}
            >
              {t("inv.resetColors")}
            </button>
          )}
          <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
            <span className="flex justify-between">
              {t("inv.spacing")}
              <span className="tabular-nums">{s.padY ?? "auto"}</span>
            </span>
            <input
              type="range"
              min={0}
              max={160}
              step={4}
              value={s.padY ?? 28}
              onChange={(e) => setStyle({ padY: Number(e.target.value) }, `${block.id}:pad`)}
              className="accent-primary"
            />
          </label>
          <Button variant="outline" className="h-9" onClick={() => setStyle({ hidden: !s.hidden })}>
            {s.hidden ? <Eye /> : <EyeOff />}
            {s.hidden ? t("admin.show") : t("admin.hide")}
          </Button>
        </div>
      </Group>
    </div>
  );
}

function ScheduleEditor({ block, onPatch }: { block: InvitationBlock; onPatch: (p: Partial<InvitationBlock>, key?: string) => void }) {
  const { t } = useI18n();
  const items = block.items ?? [];
  const set = (next: typeof items, key?: string) => onPatch({ items: next }, key);
  return (
    <Group title={t("inv.blocks.schedule")}>
      <ul className="flex flex-col gap-2">
        {items.map((it, i) => (
          <li key={it.id} className="grid grid-cols-[72px_1fr_auto] gap-1.5">
            <input
              type="time"
              value={it.time}
              onChange={(e) =>
                set(
                  items.map((x) => (x.id === it.id ? { ...x, time: e.target.value } : x)),
                  `${it.id}:time`,
                )
              }
              className={cn(inputClass, "px-2")}
            />
            <input
              value={it.title}
              onChange={(e) =>
                set(
                  items.map((x) => (x.id === it.id ? { ...x, title: e.target.value } : x)),
                  `${it.id}:title`,
                )
              }
              className={inputClass}
            />
            <MiniBtn label={t("inv.delete")} onClick={() => set(items.filter((_, k) => k !== i))}>
              <X className="size-3.5" />
            </MiniBtn>
          </li>
        ))}
      </ul>
      <Button variant="outline" className="mt-2 h-9 w-full" onClick={() => set([...items, { id: blockId(), time: "20:00", title: "" }])}>
        <Plus />
        {t("inv.addItem")}
      </Button>
    </Group>
  );
}
