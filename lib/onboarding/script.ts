/**
 * Onboarding as a conversation. A small, pure state machine: the chat asks
 * the first unanswered step, and one message can answer several steps at once
 * ("свадьба 15 августа, человек 200, Бишкек" fills four). The UI only renders
 * this state, so it is easy to test and to resume after a reload.
 */
import type { CategoryId } from "@/lib/data/types";
import {
  type EventType,
  parseBudget,
  parseCategories,
  parseCategory,
  parseCity,
  parseDate,
  parseEventType,
  parseGuests,
  parseName,
  parsePhone,
  parseRole,
  parseText,
} from "./parse";

export type OnbRole = "client" | "vendor";

export interface Answers {
  name?: string;
  role?: OnbRole;
  eventType?: EventType;
  /** custom title when the user described the event in their own words */
  eventTitle?: string;
  date?: string;
  city?: string;
  guests?: number;
  /** 0 = not decided yet */
  budget?: number;
  priorities?: CategoryId[];
  bizName?: string;
  category?: CategoryId;
  /** null = skipped */
  phone?: string | null;
  tagline?: string;
  /** vendor's first service: what and how much (KGS) */
  offerTitle?: string;
  offerPrice?: number;
}

export type StepId =
  | "name"
  | "role"
  | "eventType"
  | "date"
  | "city"
  | "guests"
  | "budget"
  | "priorities"
  | "bizName"
  | "category"
  | "phone"
  | "tagline"
  | "offerTitle"
  | "offerPrice"
  | "summary";

export type StepKind = "text" | "choice" | "multi" | "date" | "summary";

export interface StepDef {
  id: StepId;
  kind: StepKind;
  /** the answer field this step fills */
  field?: keyof Answers;
  optional?: boolean;
  /** chip values; labels are i18n keys onboarding.options.<step>.<value> */
  options?: string[];
}

export const CATEGORY_OPTIONS: CategoryId[] = [
  "halls",
  "cars",
  "hosts",
  "photo",
  "decor",
  "music",
  "cakes",
  "beauty",
  "attire",
  "furniture",
  "traditional",
  "shows",
];

export const STEPS: Record<StepId, StepDef> = {
  name: { id: "name", kind: "text", field: "name" },
  role: { id: "role", kind: "choice", field: "role", options: ["client", "vendor"] },
  eventType: {
    id: "eventType",
    kind: "choice",
    field: "eventType",
    options: ["wedding", "toi", "anniversary", "birthday", "corporate", "other"],
  },
  date: { id: "date", kind: "date", field: "date", options: ["month", "3m", "6m", "year"] },
  city: { id: "city", kind: "choice", field: "city", options: ["bishkek", "osh", "cholpon-ata"] },
  guests: { id: "guests", kind: "choice", field: "guests", options: ["50", "100", "200", "300", "500"] },
  budget: {
    id: "budget",
    kind: "choice",
    field: "budget",
    options: ["500000", "1000000", "2000000", "4000000", "0"],
  },
  priorities: { id: "priorities", kind: "multi", field: "priorities", optional: true, options: CATEGORY_OPTIONS },
  bizName: { id: "bizName", kind: "text", field: "bizName" },
  category: { id: "category", kind: "choice", field: "category", options: CATEGORY_OPTIONS },
  phone: { id: "phone", kind: "text", field: "phone", optional: true },
  tagline: { id: "tagline", kind: "text", field: "tagline" },
  offerTitle: { id: "offerTitle", kind: "text", field: "offerTitle" },
  offerPrice: { id: "offerPrice", kind: "choice", field: "offerPrice", options: ["10000", "25000", "50000", "100000", "250000"] },
  summary: { id: "summary", kind: "summary" },
};

export const CLIENT_STEPS: StepId[] = ["eventType", "date", "city", "guests", "budget", "priorities", "summary"];
export const VENDOR_STEPS: StepId[] = ["bizName", "category", "city", "phone", "tagline", "offerTitle", "offerPrice", "summary"];

export function stepsFor(a: Answers): StepId[] {
  const tail = a.role === "vendor" ? VENDOR_STEPS : a.role === "client" ? CLIENT_STEPS : [];
  return ["name", "role", ...tail];
}

const answered = (a: Answers, id: StepId) => {
  const field = STEPS[id].field;
  return field ? a[field] !== undefined : false;
};

export function currentStep(a: Answers): StepId {
  return stepsFor(a).find((id) => id !== "summary" && !answered(a, id)) ?? "summary";
}

/** 0…1 for the thin progress line. Before the role is known we assume the client path */
export function progress(a: Answers): number {
  const steps = a.role ? stepsFor(a) : ["name", "role", ...CLIENT_STEPS];
  const real = steps.filter((s) => s !== "summary");
  const done = real.filter((s) => answered(a, s as StepId)).length;
  return done / (real.length + 1);
}

// ── Answer parsing ────────────────────────────────────────────

/** Parse a typed answer for `step`. Client steps also pick up other details mentioned in passing. */
export function parseAnswer(step: StepId, text: string, a: Answers, now = new Date()): Partial<Answers> | null {
  const own = parseOwn(step, text, now);
  if (!own) return null;
  if (a.role !== "client" && own.role !== "client") return own;
  // opportunistic extraction for the client path (strict parsers: need a unit or a month)
  const extra: Partial<Answers> = {};
  const fill = <K extends keyof Answers>(k: K, v: Answers[K] | null) => {
    if (v !== null && v !== undefined && a[k] === undefined && own[k] === undefined) extra[k] = v;
  };
  fill("eventType", parseEventType(text));
  fill("date", parseDate(text, now));
  fill("city", parseCity(text));
  fill("guests", parseGuests(text, true));
  fill("budget", parseBudget(text, true));
  return { ...own, ...extra };
}

function parseOwn(step: StepId, text: string, now: Date): Partial<Answers> | null {
  switch (step) {
    case "name": {
      const v = parseName(text);
      return v ? { name: v } : null;
    }
    case "role": {
      const v = parseRole(text);
      return v ? { role: v } : null;
    }
    case "eventType": {
      const v = parseEventType(text);
      if (v) return { eventType: v };
      const title = parseText(text, 3, 80);
      // a description we can't classify still makes a fine event title
      return title && !/\d/.test(title) && title.split(" ").length <= 6 ? { eventType: "other", eventTitle: title } : null;
    }
    case "date": {
      const v = parseDate(text, now);
      return v ? { date: v } : null;
    }
    case "city": {
      const v = parseCity(text);
      return v ? { city: v } : null;
    }
    case "guests": {
      const v = parseGuests(text);
      return v ? { guests: v } : null;
    }
    case "budget": {
      if (/(не знаю|пока нет|не решил|don't know|not sure|no idea)/i.test(text)) return { budget: 0 };
      const v = parseBudget(text);
      return v ? { budget: v } : null;
    }
    case "priorities": {
      const v = parseCategories(text);
      return v.length ? { priorities: v } : null;
    }
    case "bizName": {
      const v = parseText(text, 2, 80);
      return v ? { bizName: v } : null;
    }
    case "category": {
      const v = parseCategory(text);
      return v ? { category: v } : null;
    }
    case "phone": {
      const v = parsePhone(text);
      return v ? { phone: v } : null;
    }
    case "tagline": {
      const v = parseText(text, 8, 160);
      return v ? { tagline: v } : null;
    }
    case "offerTitle": {
      const v = parseText(text, 3, 80);
      if (!v) return null;
      // "Кортеж из 5 машин — 40 000 сом" answers both steps at once
      const price = parseBudget(text, true);
      const title = v.replace(/[—–-]?\s*(от\s*)?\d[\d\s.,]*\s*(сом|som|kgs|тыс\S*|к|k)?\s*$/i, "").trim() || v;
      return price ? { offerTitle: title, offerPrice: price } : { offerTitle: v };
    }
    case "offerPrice": {
      const v = parseBudget(text);
      return v && v >= 100 ? { offerPrice: v } : null;
    }
    default:
      return null;
  }
}

/**
 * The voice-first start: the user tells everything in one go
 * («Меня зовут Айгерим, у нас свадьба 14 июня в Бишкеке, человек 150, бюджет 1,5 млн»).
 * Picks every detail it recognises; the chat then asks only for what's missing.
 */
/** Someone looking for a service, not offering one: «нужен фотограф», «ищем зал» */
const NEED_CUE = /(нуж[енад]|ищу|ищем|хочу|хотим|планиру|подыскива|подбира|need|looking for|\bwant\b)/i;
/** «я фотограф», «у меня своя студия» */
const VENDOR_SELF_CUE =
  /(я\s+(фотограф|видеограф|ведущ|тамад|флорист|декоратор|визажист|стилист|кондитер|диджей|dj|музыкант|певец|певица|аниматор)|у (меня|нас)\s+(сво[йяёеи]\S*\s+|есть\s+)?(\S+\s+)?(студи|компани|салон|зал|ресторан|кафе|парк|автопарк|машин|агентств|кондитерск|ателье|команд)|i'm a (photographer|host|florist|dj)|i run|we (rent|offer)|i offer)/i;
const VENDOR_WORK_CUE =
  /(фотограф|видеограф|ведущ(ий|ая)|тамада|флорист|декоратор|визажист|стилист|кондитер|диджей|музыкант|аниматор|сда[её]м|сдаю|аренда|прокат|оказыва|предлага|предоставля|снима(ю|ем)|оформля(ю|ем)|пеку|печ[её]м|шь(ю|[её]м)|провожу|проводим|photographer|videographer|florist|\bdj\b)/i;

/** True when the text reads like someone offering services rather than planning an event */
export function looksLikeVendor(text: string, now = new Date()): boolean {
  if (VENDOR_SELF_CUE.test(text)) return true;
  // a bare profession is weak: «свадьба 14 июня, 150 гостей, ведущий и фотограф» is a client's wish list
  if (NEED_CUE.test(text) || parseDate(text, now) || parseGuests(text, true)) return false;
  return VENDOR_WORK_CUE.test(text);
}

/** `forcedRole`: the user already chose the path on the start screen, so the text can't change it */
export function parseStory(text: string, now = new Date(), forcedRole?: OnbRole): Partial<Answers> {
  const out: Partial<Answers> = {};
  const nameMatch = text.match(/(?:меня зовут|зовут меня|my name is|call me|i'm|i am|я\s+[—–-])\s+(\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)?)/iu);
  const name = nameMatch && parseName(nameMatch[1]);
  if (name) out.name = name;

  const eventType = parseEventType(text);
  const date = parseDate(text, now);
  const city = parseCity(text);
  const guests = parseGuests(text, true);
  const budget = parseBudget(text, true);
  const role = forcedRole ?? (looksLikeVendor(text, now) ? "vendor" : (parseRole(text) ?? (eventType || date || guests ? "client" : null)));
  if (!role) return out;
  out.role = role;
  if (city) out.city = city;

  if (role === "vendor") {
    const category = parseCategory(text);
    if (category) out.category = category;
    const phone = text.match(/\+?\d[\d\s()-]{7,}\d/);
    const parsedPhone = phone && parsePhone(phone[0]);
    if (parsedPhone) out.phone = parsedPhone;
    return out;
  }
  if (eventType) out.eventType = eventType;
  if (date) out.date = date;
  if (guests) out.guests = guests;
  if (budget) out.budget = budget;
  const priorities = parseCategories(text).filter((c) => c !== "halls" || /зал|ресторан|hall|venue/i.test(text));
  if (priorities.length) out.priorities = priorities;
  return out;
}

/** A chip tap → answer */
export function choiceAnswer(step: StepId, value: string): Partial<Answers> {
  switch (step) {
    case "role":
      return { role: value as OnbRole };
    case "eventType":
      return { eventType: value as EventType };
    case "city":
      return { city: value };
    case "guests":
    case "budget":
    case "offerPrice":
      return { [step]: Number(value) } as Partial<Answers>;
    case "category":
      return { category: value as CategoryId };
    default:
      return {};
  }
}

export function skipAnswer(step: StepId): Partial<Answers> {
  if (step === "phone") return { phone: null };
  if (step === "priorities") return { priorities: [] };
  return {};
}

/** Validates and cleans fields coming back from the AI route (never trust the model) */
export function sanitizeAiFields(raw: unknown, now = new Date()): Partial<Answers> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<Answers> = {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const name = str(r.name) && parseName(str(r.name)!);
  if (name) out.name = name;
  if (r.role === "client" || r.role === "vendor") out.role = r.role;
  if (typeof r.eventType === "string" && ["wedding", "toi", "anniversary", "corporate", "birthday", "other"].includes(r.eventType))
    out.eventType = r.eventType as EventType;
  const title = str(r.eventTitle);
  if (title) out.eventTitle = title.slice(0, 80);
  const date = str(r.date);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && parseDate(date, now) === date) out.date = date;
  const city = str(r.city) && parseCity(str(r.city)!);
  if (city) out.city = city;
  if (typeof r.guests === "number" && r.guests >= 1 && r.guests <= 5000) out.guests = Math.round(r.guests);
  if (typeof r.budget === "number" && (r.budget === 0 || (r.budget >= 10_000 && r.budget <= 1e9))) out.budget = Math.round(r.budget);
  if (Array.isArray(r.priorities)) {
    const p = r.priorities.filter((c): c is CategoryId => CATEGORY_OPTIONS.includes(c as CategoryId));
    if (p.length) out.priorities = Array.from(new Set(p));
  }
  const biz = str(r.bizName);
  if (biz) out.bizName = biz.slice(0, 80);
  if (typeof r.category === "string" && CATEGORY_OPTIONS.includes(r.category as CategoryId)) out.category = r.category as CategoryId;
  const phone = str(r.phone) && parsePhone(str(r.phone)!);
  if (phone) out.phone = phone;
  const tagline = str(r.tagline);
  if (tagline && tagline.length >= 8) out.tagline = tagline.slice(0, 160);
  const offer = str(r.offerTitle);
  if (offer) out.offerTitle = offer.slice(0, 80);
  if (typeof r.offerPrice === "number" && r.offerPrice >= 100 && r.offerPrice <= 1e8) out.offerPrice = Math.round(r.offerPrice);
  return out;
}

/** Remove one step's answer (used by «Изменить» on the summary card) */
export function clearStep(a: Answers, step: StepId): Answers {
  const field = STEPS[step].field;
  if (!field) return a;
  const next = { ...a };
  delete next[field];
  if (step === "eventType") delete next.eventTitle;
  if (step === "role") {
    // switching path: drop everything that belonged to the other branch
    for (const s of [...CLIENT_STEPS, ...VENDOR_STEPS]) {
      const f = STEPS[s].field;
      if (f) delete next[f];
    }
    delete next.eventTitle;
  }
  return next;
}

/** Steps a set of answers fills, in path order (used to log what one reply covered) */
export function filledSteps(before: Answers, after: Answers): StepId[] {
  return stepsFor(after).filter((id) => {
    const f = STEPS[id].field;
    return f && before[f] === undefined && after[f] !== undefined;
  });
}

/** Keep only fields that belong to the user's path and are not answered yet */
export function mergeAnswers(a: Answers, patch: Partial<Answers>): Answers {
  const next: Answers = { ...a };
  const role = a.role ?? patch.role;
  const allowed = new Set<keyof Answers>(["name", "role"]);
  for (const id of role === "vendor" ? VENDOR_STEPS : role === "client" ? CLIENT_STEPS : []) {
    const f = STEPS[id].field;
    if (f) allowed.add(f);
  }
  if (role === "client") allowed.add("eventTitle");
  for (const [k, v] of Object.entries(patch) as [keyof Answers, never][]) {
    if (v === undefined || !allowed.has(k) || next[k] !== undefined) continue;
    next[k] = v;
  }
  return next;
}
