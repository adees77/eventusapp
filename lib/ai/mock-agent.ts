/**
 * DEMO: a rule-based stand-in for Claude, used when ANTHROPIC_API_KEY is not
 * set. It follows the same protocol and calls the same tools, so the UI and
 * the booking flow behave exactly like with the real model — only the
 * language understanding is simpler.
 */
import { addDays, format, isBefore, parseISO, setDate, setMonth, startOfDay } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import type { CategoryId, Locale } from "@/lib/data/types";
import type { ChatContentBlock, ChatContext, ChatEvent, ChatMessage } from "./protocol";
import type { AlternativeDate, AvailabilityResult, SearchResult, ToolName } from "./tool-defs";

// ── Parsing ────────────────────────────────────────────────────

const CATEGORY_PATTERNS: [CategoryId, RegExp][] = [
  ["cars", /кортеж|гелик|гелен|геленд|gelande|g-?class|g-?wagon|гелендваген|машин|авто(?!р)|лимузин|седан|motorcade|\bcars?\b|limo|унаа/i],
  ["halls", /зал|ресторан|банкет|площадк|тойкана|\bhall|venue|banquet/i],
  ["hosts", /ведущ|тамада|\bhost|\bmc\b|алып баруучу/i],
  ["photo", /фото|видео|оператор|съёмк|съемк|photo|video|film/i],
  ["decor", /декор|оформлен|флорист|цвет(ы|ов|ами)|арк[аиу]|decor|flower|florist|arch/i],
  ["music", /музык|\bdj\b|диджей|групп[аыу]|скрип|квартет|певиц|band|music|violin|singer/i],
  ["cakes", /торт|кенди|cake|candy/i],
  ["beauty", /визаж|макияж|причёск|прическ|makeup|make-up|hair/i],
  ["attire", /плать|костюм|смокинг|dress|suit|tuxedo/i],
  ["traditional", /юрт|боз үй|чапан|калпак|кыз узатуу|сеп\b|yurt|chapan|kalpak/i],
  ["shows", /фейерверк|салют|шоу|огненн|fireworks|salute|show/i],
  ["furniture", /стул|стол(?!иц)|мебел|chair|table|furniture/i],
];

const MONTHS: Record<string, number> = {
  январ: 0, феврал: 1, март: 2, апрел: 3, ма: 4, июн: 5, июл: 6, август: 7, сентябр: 8, октябр: 9, ноябр: 10, декабр: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function monthIndex(word: string): number | null {
  const w = word.toLowerCase();
  // longest prefix wins ("ма" must not shadow "март")
  const keys = Object.keys(MONTHS).sort((a, b) => b.length - a.length);
  for (const k of keys) if (w.startsWith(k)) return MONTHS[k];
  return null;
}

function nextOccurrence(month: number, day: number, today: Date, year?: number): Date {
  if (year) return new Date(year, month, day);
  let d = setDate(setMonth(today, month), day);
  if (isBefore(d, today)) d = new Date(today.getFullYear() + 1, month, day);
  return d;
}

export interface Slots {
  category?: CategoryId;
  /** a specific model/item, matched against offer titles */
  query?: string;
  date?: string;
  guests?: number;
  qty?: number;
  budget?: number;
  city?: string;
}

export function parseSlots(text: string, todayIso: string): Slots {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  const today = startOfDay(parseISO(todayIso));
  const s: Slots = {};

  for (const [cat, re] of CATEGORY_PATTERNS) {
    if (re.test(t)) {
      s.category = cat;
      break;
    }
  }

  if (/гелик|геленд|gelande|g-?class|g-?wagon|гелендваген/.test(t)) s.query = "G-Class";
  else if (/лимузин|limo/.test(t)) s.query = "лимузин";
  else if (/s-?class|эска/.test(t)) s.query = "S-Class";

  // dates: "14 июня [2027]", "june 14", "14.06[.2027]", "2027-06-14", "завтра", "послезавтра"
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) s.date = `${m[1]}-${m[2]}-${m[3]}`;
  if (!s.date && (m = t.match(/\b(\d{1,2})\s+([a-zа-яё]{3,})\.?(?:\s+(\d{4}))?/i))) {
    const mi = monthIndex(m[2]);
    if (mi !== null) s.date = format(nextOccurrence(mi, +m[1], today, m[3] ? +m[3] : undefined), "yyyy-MM-dd");
  }
  if (!s.date && (m = t.match(/\b([a-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i))) {
    const mi = monthIndex(m[1]);
    if (mi !== null) s.date = format(nextOccurrence(mi, +m[2], today), "yyyy-MM-dd");
  }
  if (!s.date && (m = t.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/))) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : undefined;
    const month = +m[2] - 1;
    if (month >= 0 && month < 12 && +m[1] >= 1 && +m[1] <= 31)
      s.date = format(nextOccurrence(month, +m[1], today, y), "yyyy-MM-dd");
  }
  if (!s.date && /послезавтра|day after tomorrow/.test(t)) s.date = format(addDays(today, 2), "yyyy-MM-dd");
  else if (!s.date && /завтра|tomorrow|эртең/.test(t)) s.date = format(addDays(today, 1), "yyyy-MM-dd");

  if ((m = t.match(/(\d{2,4})\s*(?:гост|человек|чел\b|guests?|people|конок)/))) s.guests = +m[1];

  if (
    (m = t.match(/(\d{1,3})\s*(?:шт|штук|геликов|гелик|машин|авто|g-?class|g-?wagon|gelandewagen|cars?|стульев|столов)/)) ||
    (m = t.match(/(?:кортеж|motorcade)\s*(?:из|of)\s*(\d{1,3})/))
  )
    s.qty = +m[1];

  if ((m = t.match(/(?:до|бюджет|budget|under|up to)\s*(\d[\d\s]*)\s*(тыс|k|000)?/))) {
    const n = +m[1].replace(/\s/g, "");
    if (n) s.budget = m[2] ? n * 1000 : n;
  }

  if (/чолпон|иссык|issyk|cholpon/.test(t)) s.city = "cholpon-ata";
  else if (/\bош\b|\bosh\b/.test(t)) s.city = "osh";
  else if (/бишкек|bishkek/.test(t)) s.city = "bishkek";

  return s;
}

// ── Helpers ────────────────────────────────────────────────────

const CAT_NAMES: Record<CategoryId, { ru: [string, string]; en: string }> = {
  // [nominative, accusative-ish for "нужен …"]
  cars: { ru: ["кортеж", "кортеж"], en: "motorcade" },
  halls: { ru: ["банкетный зал", "зал"], en: "banquet hall" },
  hosts: { ru: ["ведущий", "ведущего"], en: "host" },
  photo: { ru: ["фото и видео", "фото и видео"], en: "photo and video" },
  decor: { ru: ["декор", "декор"], en: "decor" },
  music: { ru: ["музыка", "музыкантов"], en: "music" },
  cakes: { ru: ["торт", "торт"], en: "cake" },
  beauty: { ru: ["визажист", "визажиста"], en: "makeup artist" },
  attire: { ru: ["платье или костюм", "платье или костюм"], en: "dress or suit" },
  traditional: { ru: ["той-атрибутика", "той-атрибутику"], en: "traditional items" },
  shows: { ru: ["шоу", "шоу"], en: "show" },
  furniture: { ru: ["мебель", "мебель"], en: "furniture" },
};

const NEXT_FOR_WEDDING: CategoryId[] = ["halls", "cars", "hosts", "photo", "decor", "cakes"];

function textOf(m: ChatMessage): string {
  if (typeof m.content === "string") return m.content;
  if (!m.content) return "";
  return m.content.map((b) => (b.type === "text" ? b.text : "")).join(" ");
}

function isToolResultMessage(m: ChatMessage) {
  return m.role === "user" && Array.isArray(m.content) && m.content.some((b) => b.type === "tool_result");
}

function fmtDate(iso: string, locale: Locale) {
  return format(parseISO(iso), locale === "ru" ? "d MMMM" : "MMMM d", { locale: locale === "ru" ? ru : enUS });
}

function money(n: number, locale: Locale) {
  return `${new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US").format(n)} ${locale === "ru" ? "сом" : "som"}`;
}

function plural(n: number, one: string, few: string, many: string) {
  const r = new Intl.PluralRules("ru").select(n);
  return r === "one" ? one : r === "few" ? few : many;
}

function detectLocale(text: string, fallback: Locale): Locale {
  const cyr = (text.match(/[а-яё]/gi) ?? []).length;
  const lat = (text.match(/[a-z]/gi) ?? []).length;
  if (cyr + lat < 3) return fallback;
  return lat > cyr ? "en" : "ru";
}

let idCounter = 0;
const toolId = () => `toolu_mock_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

// ── Agent ──────────────────────────────────────────────────────

export interface MockTurn {
  text: string;
  toolUse?: { name: ToolName; input: Record<string, unknown> };
}

export function mockTurn(messages: ChatMessage[], ctx: ChatContext): MockTurn {
  const last = messages[messages.length - 1];
  const userTexts = messages.filter((m) => m.role === "user" && !isToolResultMessage(m)).map(textOf);
  const lastUserText = userTexts[userTexts.length - 1] ?? "";
  const locale = detectLocale(lastUserText, ctx.locale);
  const L = (ruText: string, enText: string) => (locale === "ru" ? ruText : enText);

  // 1) We just got tool results → summarise them
  if (isToolResultMessage(last)) {
    const block = (last.content as ChatContentBlock[]).find((b) => b.type === "tool_result");
    const prev = messages[messages.length - 2];
    const use = Array.isArray(prev?.content) ? prev.content.find((b) => b.type === "tool_use") : undefined;
    const raw = block && block.type === "tool_result" ? block.content : undefined;
    const json = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((b) => (b.type === "text" ? b.text : "")).join("") : "{}";
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      data = {};
    }
    if (use && use.type === "tool_use" && use.name === "search_vendors") {
      return { text: summariseSearch(data as SearchResult, use.input as Record<string, unknown>, locale, ctx) };
    }
    if (use && use.type === "tool_use" && use.name === "check_availability") {
      const a = data as AvailabilityResult;
      const free = a.offers?.reduce((s, o) => s + o.free, 0) ?? 0;
      return {
        text: L(
          `У ${a.name} на ${fmtDate(a.date, "ru")} свободно ${free} ${plural(free, "единица", "единицы", "единиц")}.`,
          `${a.name} has ${free} units free on ${fmtDate(a.date, "en")}.`,
        ),
      };
    }
    return { text: L("Готово. Что ещё подобрать?", "Done. What else can I find for you?") };
  }

  // 2) Read slots: latest message has priority, earlier ones fill gaps
  const latest = parseSlots(lastUserText, ctx.today);
  const merged: Slots = {};
  for (const t of userTexts) Object.assign(merged, stripUndefined(parseSlots(t, ctx.today)));
  Object.assign(merged, stripUndefined(latest));

  const latestHasInfo = Object.keys(stripUndefined(latest)).length > 0;
  const alreadySearched = messages.some(
    (m) => m.role === "assistant" && Array.isArray(m.content) && m.content.some((b) => b.type === "tool_use"),
  );
  const date = merged.date ?? ctx.event?.date ?? ctx.plannerDate ?? undefined;
  const guests = merged.guests ?? ctx.event?.guests;
  const dateFromContext = !merged.date && date;

  // Small talk after results
  if (!latestHasInfo && alreadySearched) {
    if (/спасибо|рахмат|thank/i.test(lastUserText))
      return { text: L("Пожалуйста. Если понадобится ещё что-то к празднику, просто напишите.", "You're welcome. If you need anything else for the celebration, just write.") };
    return {
      text: L(
        "Подскажите, что ещё нужно: зал, кортеж, ведущий, фото или декор? Можно сразу с датой.",
        "Tell me what else you need: a hall, motorcade, host, photo or decor? You can include the date.",
      ),
    };
  }

  // No category yet
  if (!merged.category) {
    if (date) {
      const g = guests ? L(`, ${guests} ${plural(guests, "гость", "гостя", "гостей")}`, `, ${guests} guests`) : "";
      return {
        text: L(
          `Записала: ${fmtDate(date, "ru")}${g}. С чего начнём: зал, кортеж, ведущий или фото и видео?`,
          `Noted: ${fmtDate(date, "en")}${g}. Where shall we start: a hall, motorcade, host, or photo and video?`,
        ),
      };
    }
    return {
      text: L(
        "Помогу подобрать всё к празднику. Какая дата и что нужно в первую очередь: зал, кортеж, ведущий, фото?",
        "I'll help you put the celebration together. What's the date, and what do you need first: a hall, motorcade, host, photo?",
      ),
    };
  }

  const cat = merged.category;
  const catName = locale === "ru" ? CAT_NAMES[cat].ru[1] : CAT_NAMES[cat].en;

  // Need a date to check availability
  if (!date) {
    return {
      text: L(`На какую дату нужен ${catName}? Проверю, кто свободен именно в этот день.`, `What date do you need the ${catName} for? I'll check who is free that day.`),
    };
  }

  // Search
  const input: Record<string, unknown> = { category: cat, date };
  if (merged.city) input.city = merged.city;
  if (cat === "halls" && guests) input.guests = guests;
  if (merged.qty) input.qty = merged.qty;
  if (merged.budget) input.budget_max = merged.budget;
  if (merged.query && cat === "cars") input.query = merged.query;

  const ctxNote = dateFromContext && ctx.event?.date === date ? L(" — дату беру из вашего мероприятия", " — using your event date") : "";
  const qtyNote = merged.qty ? L(`, нужно ${merged.qty}`, `, ${merged.qty} needed`) : "";
  return {
    text: L(
      `Проверяю, кто свободен ${fmtDate(date, "ru")}${qtyNote}${ctxNote}.`,
      `Checking who is free on ${fmtDate(date, "en")}${qtyNote}${ctxNote}.`,
    ),
    toolUse: { name: "search_vendors", input },
  };
}

function summariseSearch(r: SearchResult, input: Record<string, unknown>, locale: Locale, ctx: ChatContext): string {
  const L = (ruText: string, enText: string) => (locale === "ru" ? ruText : enText);
  const cat = input.category as CategoryId | undefined;
  const dateStr = r.date ? fmtDate(r.date, locale) : "";

  if (!r.count) {
    const alts = (r.alternatives ?? []) as AlternativeDate[];
    if (alts.length) {
      const list = alts.map((a) => fmtDate(a.date, locale)).join(", ");
      return L(
        `На ${dateStr} подходящих свободных вариантов нет. Ближайшие даты, где есть свободные: ${list}. Проверить одну из них или поискать другой класс?`,
        `Nothing suitable is free on ${dateStr}. Nearest dates with availability: ${list}. Shall I check one of them or look at another class?`,
      );
    }
    return L(
      `На ${dateStr} ничего подходящего не нашлось. Можно попробовать другую дату или изменить требования.`,
      `I couldn't find anything suitable on ${dateStr}. Try another date or adjust the requirements.`,
    );
  }

  const best = r.vendors[0];
  const qty = r.qty;
  let lead: string;
  if (best.offer) {
    const enough = qty ? L(` — хватит на ${qty}`, ` — enough for ${qty}`) : "";
    lead = L(
      `Нашла ${r.count} ${plural(r.count, "вариант", "варианта", "вариантов")} на ${dateStr}. Лучше всего подходит ${best.name}: ${best.offer.title}, свободно ${best.offer.free} из ${best.offer.total}${enough}, ${money(best.offer.price, locale)} за ${best.offer.unit}.`,
      `Found ${r.count} option${r.count === 1 ? "" : "s"} for ${dateStr}. Best fit: ${best.name} — ${best.offer.title}, ${best.offer.free} of ${best.offer.total} free${enough}, ${money(best.offer.price, locale)} per ${best.offer.unit}.`,
    );
  } else {
    lead = L(`Вот что есть в каталоге: ${r.count} ${plural(r.count, "вариант", "варианта", "вариантов")}.`, `Here's what the catalog has: ${r.count} options.`);
  }
  const book = L(" Забронировать можно прямо с карточки.", " You can book straight from the card.");

  const isWedding = /свадь|той|wedding|кыз узатуу|кудалык/i.test(ctx.event?.title ?? "");
  const nextCat = isWedding && cat ? NEXT_FOR_WEDDING.find((c) => c !== cat && c !== "halls") : undefined;
  const next = nextCat
    ? L(` Подобрать ещё ${CAT_NAMES[nextCat].ru[1]} на эту дату?`, ` Shall I find a ${CAT_NAMES[nextCat].en} for this date too?`)
    : "";
  return lead + book + next;
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Stream a mock turn as protocol events, word by word, like a model would. */
export async function* streamMockTurn(messages: ChatMessage[], ctx: ChatContext): AsyncGenerator<ChatEvent> {
  const turn = mockTurn(messages, ctx);
  await sleep(350);
  const words = turn.text.split(/(\s+)/);
  for (const w of words) {
    if (!w) continue;
    yield { type: "text", text: w };
    await sleep(w.trim() ? 18 + Math.random() * 22 : 0);
  }
  const content: ChatContentBlock[] = [{ type: "text", text: turn.text }];
  if (turn.toolUse) {
    yield { type: "tool", name: turn.toolUse.name };
    content.push({ type: "tool_use", id: toolId(), name: turn.toolUse.name, input: turn.toolUse.input });
  }
  yield { type: "done", content, stop_reason: turn.toolUse ? "tool_use" : "end_turn" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
