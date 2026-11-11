/**
 * Invitation v2: a web page made of blocks. Pure helpers shared by the
 * editor, the public page, the seed and the store migration.
 */
import type {
  BlockType,
  Invitation,
  InvitationBlock,
  InvitationDesign,
  InvitationOccasion,
  InvitationStyle,
  InvitationTheme,
  ScheduleItem,
} from "@/lib/data/types";

let seq = 0;
export const blockId = () => `bl-${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const THEMES: InvitationTheme[] = [
  { id: "paper", bg: "#FBF9F4", ink: "#1B2433", muted: "#6E6759", accent: "#B8955A", surface: "#FFFFFF", display: "serif", body: "sans" },
  { id: "white", bg: "#FFFFFF", ink: "#111827", muted: "#6B7487", accent: "#2A5FA5", surface: "#F5F7FA", display: "sans", body: "sans" },
  { id: "night", bg: "#12223D", ink: "#F5EFE3", muted: "#AEB8CA", accent: "#C9A96E", surface: "#1A2E50", display: "serif", body: "sans" },
  { id: "sage", bg: "#F2F1EA", ink: "#27342A", muted: "#687263", accent: "#7F9172", surface: "#FBFAF6", display: "serif", body: "sans" },
  { id: "rose", bg: "#FAF3F0", ink: "#3A2328", muted: "#8A6E72", accent: "#B07A7F", surface: "#FFFFFF", display: "script", body: "serif" },
  { id: "sky", bg: "#EEF3FA", ink: "#14284A", muted: "#5A6B86", accent: "#2A5FA5", surface: "#FFFFFF", display: "serif", body: "sans" },
];

export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

const STYLE_THEME: Record<InvitationStyle, string> = {
  classic: "paper",
  minimal: "white",
  night: "night",
  arch: "sage",
  ornament: "rose",
  photo: "paper",
};

export type CoverVariant = "frame" | "plain" | "arch" | "photo" | "ornament";
const STYLE_COVER: Record<InvitationStyle, CoverVariant> = {
  classic: "frame",
  minimal: "plain",
  night: "plain",
  arch: "arch",
  ornament: "ornament",
  photo: "photo",
};

/** Blocks a user can add, in palette order */
export const BLOCK_TYPES: BlockType[] = [
  "cover",
  "heading",
  "text",
  "image",
  "gallery",
  "date",
  "countdown",
  "venue",
  "schedule",
  "dresscode",
  "contacts",
  "rsvp",
  "divider",
  "spacer",
];

const DEFAULT_SCHEDULE: Record<InvitationOccasion, [string, string][]> = {
  wedding: [
    ["16:30", "Сбор гостей"],
    ["17:00", "Церемония"],
    ["18:00", "Банкет"],
    ["22:30", "Торт и фейерверк"],
  ],
  kyzUzatuu: [
    ["17:00", "Встреча гостей"],
    ["18:00", "Той"],
    ["21:00", "Проводы невесты"],
  ],
  birthday: [
    ["19:00", "Сбор гостей"],
    ["19:30", "Ужин"],
    ["21:00", "Торт"],
  ],
  jubilee: [
    ["18:00", "Встреча гостей"],
    ["18:30", "Торжественная часть"],
    ["19:30", "Банкет"],
  ],
  sunnot: [
    ["12:00", "Сбор гостей"],
    ["13:00", "Той"],
  ],
  corporate: [
    ["19:00", "Welcome"],
    ["19:30", "Награждение"],
    ["20:30", "Ужин и музыка"],
  ],
};

export function scheduleFor(occasion: InvitationOccasion): ScheduleItem[] {
  return DEFAULT_SCHEDULE[occasion].map(([time, title], i) => ({ id: `s${i}`, time, title }));
}

/** A fresh block with sensible defaults */
export function newBlock(type: BlockType, ctx?: { occasion?: InvitationOccasion; photo?: string }): InvitationBlock {
  const base = { id: blockId(), type, style: {} as InvitationBlock["style"] };
  switch (type) {
    case "cover":
      return { ...base, props: { variant: ctx?.photo ? "photo" : "frame", kicker: "", title: "" }, images: ctx?.photo ? [ctx.photo] : [] };
    case "heading":
      return { ...base, props: { text: "Заголовок" }, style: { size: "l" } };
    case "text":
      return { ...base, props: { text: "Расскажите гостям что-нибудь важное." } };
    case "image":
      return { ...base, props: { caption: "" }, images: [] };
    case "gallery":
      return { ...base, props: { title: "Наши моменты" }, images: [] };
    case "date":
      return { ...base, props: { title: "" } };
    case "countdown":
      return { ...base, props: { title: "До праздника" } };
    case "venue":
      return { ...base, props: { title: "Место" } };
    case "schedule":
      return { ...base, props: { title: "Программа дня" }, items: scheduleFor(ctx?.occasion ?? "wedding") };
    case "dresscode":
      return { ...base, props: { title: "Дресс-код", text: "Вечерний", colors: "#E8DCCB,#B8955A,#1B2433" } };
    case "contacts":
      return { ...base, props: { title: "Вопросы", name: "", phone: "" } };
    case "rsvp":
      return { ...base, props: { title: "Подтвердите присутствие", text: "Пожалуйста, ответьте до конца месяца" } };
    case "divider":
      return { ...base, props: { variant: "line" } };
    case "spacer":
      return { ...base, props: {}, style: { padY: 32 } };
  }
}

type LegacyFields = Pick<
  Invitation,
  "style" | "occasion" | "heading" | "names" | "message" | "dressCode" | "contact" | "photo"
>;

/** Converts a v1 (style + fields) invitation or a template draft into a block design */
export function designFromLegacy(inv: LegacyFields): InvitationDesign {
  const theme = { ...themeById(STYLE_THEME[inv.style] ?? "paper") };
  const blocks: InvitationBlock[] = [];
  const add = (type: BlockType, patch?: Partial<InvitationBlock>) => {
    const b = newBlock(type, { occasion: inv.occasion, photo: inv.photo });
    blocks.push({ ...b, ...patch, props: { ...b.props, ...patch?.props }, style: { ...b.style, ...patch?.style } });
  };
  add("cover", {
    props: { variant: STYLE_COVER[inv.style] ?? "frame", kicker: inv.heading, title: inv.names },
    images: inv.photo ? [inv.photo] : [],
  });
  if (inv.message) add("text", { props: { text: inv.message }, style: { align: "center", size: "l", font: "serif", italic: true } });
  add("date");
  add("countdown");
  add("venue");
  add("schedule");
  if (inv.dressCode) add("dresscode", { props: { text: inv.dressCode } });
  add("rsvp");
  if (inv.contact) add("contacts", { props: { phone: inv.contact } });
  return { theme, blocks };
}

export function moveBlock(blocks: InvitationBlock[], from: number, to: number): InvitationBlock[] {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return blocks;
  const next = [...blocks];
  const [b] = next.splice(from, 1);
  next.splice(to, 0, b);
  return next;
}

export function duplicateBlock(blocks: InvitationBlock[], id: string): InvitationBlock[] {
  const i = blocks.findIndex((b) => b.id === id);
  if (i < 0) return blocks;
  const copy: InvitationBlock = structuredClone(blocks[i]);
  copy.id = blockId();
  return [...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)];
}

// ── Stats ─────────────────────────────────────────────────────

export interface InvitationStats {
  /** everyone on the list, incl. guests added without an invitation */
  guests: number;
  /** guests who get an invitation link */
  invited: number;
  sent: number;
  opened: number;
  views: number;
  answered: number;
  coming: number;
  declined: number;
  waiting: number;
  /** people incl. +1s of those who are coming */
  persons: number;
}

/** Added by the host without an invitation and has not answered through a link: counts as coming */
const isDirect = (inv: Pick<Invitation, "rsvps">, g: Invitation["guests"][number]) =>
  !!g.direct && !inv.rsvps.some((r) => r.guestId === g.id);

export function invitationStats(inv: Pick<Invitation, "guests" | "rsvps" | "views">): InvitationStats {
  const coming = inv.rsvps.filter((r) => r.attending);
  const answeredGuestIds = new Set(inv.rsvps.flatMap((r) => (r.guestId ? [r.guestId] : [])));
  const direct = inv.guests.filter((g) => isDirect(inv, g));
  const invited = inv.guests.filter((g) => !g.direct);
  return {
    guests: inv.guests.length,
    invited: invited.length,
    sent: invited.filter((g) => g.sentAt).length,
    opened: invited.filter((g) => g.openedAt).length,
    views: inv.views.length,
    answered: inv.rsvps.length,
    coming: coming.length + direct.length,
    declined: inv.rsvps.length - coming.length,
    waiting: inv.guests.filter((g) => !g.direct && !answeredGuestIds.has(g.id)).length,
    persons: coming.reduce((s, r) => s + r.guests, 0) + direct.reduce((s, g) => s + g.seats, 0),
  };
}

export function rsvpOfGuest(inv: Pick<Invitation, "rsvps">, guestId: string) {
  return inv.rsvps.find((r) => r.guestId === guestId);
}

export function guestStatus(inv: Pick<Invitation, "rsvps">, g: Invitation["guests"][number]) {
  const r = rsvpOfGuest(inv, g.id);
  if (r) return r.attending ? "coming" : "declined";
  if (g.direct) return "coming";
  if (g.openedAt) return "opened";
  if (g.sentAt) return "sent";
  return "draft";
}
export type GuestStatus = ReturnType<typeof guestStatus>;

/** CSV for export (Excel-friendly: BOM + semicolons) */
export function guestsCsv(inv: Pick<Invitation, "guests" | "rsvps">, labels: Record<GuestStatus, string>): string {
  const esc = (s: string | number | undefined) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const rows = [["Имя", "Телефон", "Группа", "Мест", "Статус", "Персон", "Комментарий"].map(esc).join(";")];
  for (const g of inv.guests) {
    const r = rsvpOfGuest(inv, g.id);
    const persons = r ? r.guests : g.direct ? g.seats : "";
    rows.push([g.name, g.phone, g.group, g.seats, labels[guestStatus(inv, g)], persons, r?.note ?? ""].map(esc).join(";"));
  }
  // answers left through the common link (no personal guest)
  for (const r of inv.rsvps.filter((x) => !x.guestId)) {
    rows.push([r.name, "", "", "", labels[r.attending ? "coming" : "declined"], r.guests, r.note ?? ""].map(esc).join(";"));
  }
  return `﻿${rows.join("\n")}`;
}
