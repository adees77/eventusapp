/**
 * Local parsers for free-text answers in the onboarding chat (RU + EN).
 * They run first and instantly; only when they give up do we ask the AI.
 * Every parser returns null when it is not sure.
 */
import { addDays, addMonths, format, getDay, isBefore, isValid, setDate, startOfDay, startOfMonth } from "date-fns";
import type { CategoryId } from "@/lib/data/types";

export type EventType = "wedding" | "toi" | "anniversary" | "corporate" | "birthday" | "other";
export const EVENT_TYPES: EventType[] = ["wedding", "toi", "anniversary", "corporate", "birthday", "other"];

const lower = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();
const iso = (d: Date) => format(d, "yyyy-MM-dd");

// ── Names ─────────────────────────────────────────────────────

export function parseName(text: string): string | null {
  const t = text
    .trim()
    .replace(/^(меня зовут|я\s*[-—–]?|это|my name is|i am|i'm|call me)\s+/i, "")
    .split(/[,;]/)[0]
    .replace(/[.!]+$/g, "")
    .trim();
  if (t.length < 2 || t.length > 60 || /\d|@/.test(t) || t.split(/\s+/).length > 4) return null;
  return t
    .split(/\s+/)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

// ── Role ──────────────────────────────────────────────────────

export function parseRole(text: string): "client" | "vendor" | null {
  const t = lower(text);
  if (/(подряд|поставщ|исполнител|бизнес|компан|предоставля|оказыва|мои услуги|vendor|supplier|my business|i provide|i offer)/.test(t))
    return "vendor";
  if (/(планир|организ|событ|свадьб|той|юбил|праздн|ищу|клиент|plan|event|wedding|party|client|looking)/.test(t)) return "client";
  return null;
}

// ── Event type ────────────────────────────────────────────────

const EVENT_PATTERNS: [EventType, RegExp][] = [
  ["wedding", /(свадьб|никах|кыз узатуу|wedding|marriage)/],
  ["anniversary", /(юбил|anniversar|jubilee)/],
  ["corporate", /(корпорат|корпоратив|конференц|corporate|company party|offsite)/],
  ["birthday", /(день рожд|днюх|(?<![а-яa-z])др(?![а-яa-z])|birthday|b-day)/],
  ["toi", /((?<![а-яa-z])то[йяю](?![а-яa-z])|сүннөт|суннот|бешик|\btoi\b|\btoy\b)/],
];

export function parseEventType(text: string): EventType | null {
  const t = lower(text);
  for (const [type, re] of EVENT_PATTERNS) if (re.test(t)) return type;
  return null;
}

// ── Dates ─────────────────────────────────────────────────────

const MONTHS: [RegExp, number][] = [
  [/^(январ|january$|jan$)/, 0],
  [/^(феврал|february$|feb$)/, 1],
  [/^(март|march$)/, 2],
  [/^(апрел|april$|apr$)/, 3],
  [/^(ма[йяе]$|мая|may$)/, 4],
  [/^(июн|june$|jun$)/, 5],
  [/^(июл|july$|jul$)/, 6],
  [/^(август|august$|aug$)/, 7],
  [/^(сентябр|september$|sept?$)/, 8],
  [/^(октябр|october$|oct$)/, 9],
  [/^(ноябр|november$|nov$)/, 10],
  [/^(декабр|december$|dec$)/, 11],
];

function monthOf(word: string): number | null {
  for (const [re, m] of MONTHS) if (re.test(word)) return m;
  return null;
}

/** Saturday closest to the 15th — a sensible default when only the month is known */
function midMonthSaturday(year: number, month: number): Date {
  const mid = new Date(year, month, 15);
  const diff = (6 - getDay(mid) + 7) % 7;
  return addDays(mid, diff > 3 ? diff - 7 : diff);
}

function future(d: Date, today: Date, bumpYear: boolean): Date | null {
  if (!isValid(d)) return null;
  if (isBefore(d, today)) {
    if (!bumpYear) return null;
    const next = new Date(d);
    next.setFullYear(d.getFullYear() + 1);
    return next;
  }
  return d;
}

/** Returns yyyy-MM-dd in the future, or null */
export function parseDate(text: string, now = new Date()): string | null {
  const today = startOfDay(now);
  const t = lower(text);

  // 2027-08-15
  let m = t.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const d = future(new Date(+m[1], +m[2] - 1, +m[3]), today, false);
    return d && +m[3] === d.getDate() ? iso(d) : null;
  }
  // 15.08, 15.08.2027, 15/08/27
  m = t.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b(?!\s*(?:млн|миллион|тыс|million|[мmкk]\b))/);
  if (m && (m[2].length === 2 || m[3])) {
    const day = +m[1];
    const month = +m[2] - 1;
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    const year = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : today.getFullYear();
    const d = future(new Date(year, month, day), today, !m[3]);
    return d && d.getDate() === day ? iso(d) : null;
  }
  // 15 августа / august 15 / 15th of august
  const words = t.split(/[\s,]+/);
  for (let i = 0; i < words.length; i++) {
    const month = monthOf(words[i]);
    if (month === null) continue;
    const before = words[i - 1]?.match(/^(\d{1,2})(?:st|nd|rd|th|-?го|-?е)?$/);
    const before2 = words[i - 1] === "of" ? words[i - 2]?.match(/^(\d{1,2})(?:st|nd|rd|th)?$/) : null;
    const after = words[i + 1]?.match(/^(\d{1,2})(?:st|nd|rd|th)?$/);
    const yearWord = words.slice(i + 1, i + 3).find((w) => /^\d{4}$/.test(w));
    const day = Number((before ?? before2 ?? after)?.[1] ?? 0);
    const year = yearWord ? +yearWord : today.getFullYear();
    let d = day ? new Date(year, month, day) : midMonthSaturday(year, month);
    if (isBefore(d, today)) {
      if (yearWord) return null;
      d = day ? new Date(year + 1, month, day) : midMonthSaturday(year + 1, month);
    }
    if (day && d.getDate() !== day) return null;
    return iso(d);
  }
  // relative: через 3 месяца / in 3 months / next month / летом
  m = t.match(/(?:через|in)\s+(\d{1,2}|пол)\s*(месяц|мес|months?|недел|weeks?)/);
  if (m) {
    const n = m[1] === "пол" ? 6 : +m[1];
    const d = /недел|week/.test(m[2]) ? addDays(today, n * 7) : addMonths(today, n);
    return iso(d);
  }
  if (/(через год|in a year|next year|в следующем году)/.test(t)) return iso(addMonths(today, 12));
  if (/(в следующем месяце|next month)/.test(t)) {
    const d = addMonths(startOfMonth(today), 1);
    return iso(midMonthSaturday(d.getFullYear(), d.getMonth()));
  }
  if (/(через месяц|in a month)/.test(t)) return iso(addMonths(today, 1));
  const season: [RegExp, number][] = [
    [/(летом|лето|summer)/, 6],
    [/(осенью|осень|autumn|fall)/, 8],
    [/(зимой|зима|winter)/, 11],
    [/(весной|весна|spring)/, 3],
  ];
  for (const [re, month] of season) {
    if (re.test(t)) {
      const d = future(midMonthSaturday(today.getFullYear(), month), today, true)!;
      return iso(d);
    }
  }
  return null;
}

/** Quick date chips: this month / in 3 months / in 6 months / next year */
export function dateChip(chip: "month" | "3m" | "6m" | "year", now = new Date()): string {
  const today = startOfDay(now);
  const target = chip === "month" ? addDays(today, 21) : addMonths(today, chip === "3m" ? 3 : chip === "6m" ? 6 : 12);
  const sat = setDate(target, target.getDate() + ((6 - getDay(target) + 7) % 7));
  return iso(sat);
}

// ── City ──────────────────────────────────────────────────────

export function parseCity(text: string): string | null {
  const t = lower(text);
  if (/(бишкек|bishkek|фрунзе)/.test(t)) return "bishkek";
  if (/(чолпон|cholpon|иссык|issyk)/.test(t)) return "cholpon-ata";
  if (/(^|[^а-яa-z])(ош|оше|osh)($|[^а-яa-z])/.test(t)) return "osh";
  return null;
}

// ── Numbers ───────────────────────────────────────────────────

const WORD_NUMBERS: [RegExp, number][] = [
  [/(?<![а-яa-z])(сто|ста|сотня|сотни)(?![а-яa-z])|hundred/, 100],
  [/двести|two hundred/, 200],
  [/триста|three hundred/, 300],
  [/пятьдесят|fifty/, 50],
  [/тысяч[ау]?\s*гост|thousand guests/, 1000],
];

/** Guests. `strict` requires a guest word, used when scanning a message meant for another question */
export function parseGuests(text: string, strict = false): number | null {
  const t = lower(text);
  const guestWord = /(гост|человек|(?<![а-яa-z])чел(?![а-яa-z])|персон|people|guests|persons|pax)/;
  if (strict && !guestWord.test(t)) return null;
  const near = strict
    ? (t.match(/(\d[\d\s]{0,5})\s*(?:-|–|до)?\s*(\d{0,5})\s*(?:гост|человек|чел|персон|people|guests|persons|pax)/) ??
      t.match(/(?:гост\S*|человек|people|guests)\D{0,12}(\d{1,5})/))
    : null;
  const nums = (near ? near.slice(1) : (t.match(/\d[\d\s]*/g) ?? [])).map((n) => Number(String(n).replace(/\s/g, ""))).filter((n) => n > 0);
  let n = nums.length ? Math.max(...nums) : null;
  if (n === null) for (const [re, v] of WORD_NUMBERS) if (re.test(t)) n = v;
  if (n === null || n < 1 || n > 5000) return null;
  return n;
}

/** Budget in KGS: "2 млн", "1,5 млн", "500к", "800 тыс", "1 500 000 сом" */
export function parseBudget(text: string, strict = false): number | null {
  const t = lower(text).replace(/(\d),(\d)/g, "$1.$2");
  const money = /(сом|som|kgs|млн|million|\dm\b|\d\s?m\b|тыс|\d\s?к(?![а-яa-z])|\d\s?k\b|бюджет|budget)/;
  if (strict && !money.test(t)) return null;
  const m = t.match(/(\d+(?:\.\d+)?)\s*(млн|миллион\S*|million|mln|m|тыс\S*|thousand|к|k)?(?![\d.])/g);
  if (!m) return null;
  let best: number | null = null;
  for (const part of m) {
    const mm = part.match(/(\d+(?:\.\d+)?)\s*(\S*)/)!;
    let v = Number(mm[1]);
    const unit = mm[2];
    if (/^(млн|миллион|million|mln|m)/.test(unit)) v *= 1_000_000;
    else if (/^(тыс|thousand|к|k)/.test(unit)) v *= 1_000;
    if (best === null || v > best) best = v;
  }
  // plain digits with spaces: "1 500 000"
  const spaced = t.match(/\d{1,3}(?:\s\d{3})+/);
  if (spaced) best = Math.max(best ?? 0, Number(spaced[0].replace(/\s/g, "")));
  if (best === null || best < 10_000 || best > 1_000_000_000) return null;
  return Math.round(best);
}

// ── Categories ────────────────────────────────────────────────

const CATEGORY_PATTERNS: [CategoryId, RegExp][] = [
  ["cars", /(кортеж|машин|авто|лимузин|\bcars?\b|limo|motorcade)/],
  ["halls", /(зал|ресторан|банкет|площадк|\bhall|venue|restaurant)/],
  ["hosts", /(ведущ|тамад|\bhost|\bmc\b|emcee)/],
  ["photo", /(фото|видео|оператор|photo|video)/],
  ["decor", /(декор|флорист|цвет|букет|decor|flower|floral)/],
  ["music", /(музык|диджей|\bdj\b|артист|певи|певец|группа|band|music|singer)/],
  ["furniture", /(мебел|стол|стул|furniture|chairs?|tables?)/],
  ["cakes", /(торт|десерт|кондитер|cake|dessert)/],
  ["beauty", /(визаж|макияж|причес|стилист|makeup|hair|beauty)/],
  ["attire", /(плать|костюм|ателье|dress|suit|attire)/],
  ["traditional", /(юрт|атрибут|национальн|чапан|калпак|traditional|yurt)/],
  ["shows", /(шоу|фейерверк|салют|танц|show|firework|dance)/],
];

export function parseCategories(text: string): CategoryId[] {
  const t = lower(text);
  return CATEGORY_PATTERNS.filter(([, re]) => re.test(t)).map(([c]) => c);
}

export function parseCategory(text: string): CategoryId | null {
  return parseCategories(text)[0] ?? null;
}

// ── Contacts & free text ──────────────────────────────────────

export function parsePhone(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  if (digits.length === 9) return `+996 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (digits.length === 12 && digits.startsWith("996")) return `+996 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  if (digits.length === 10 && digits.startsWith("0")) return parsePhone(digits.slice(1));
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function parseText(text: string, min: number, max: number): string | null {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length < min) return null;
  return t.slice(0, max);
}
