import { brand } from "@/config/brand";
import type { VendorChatRequest } from "./vendor-protocol";

/** How the next step works, said softly instead of a blunt «book now?» */
function safePrepay(name: string, percent: number, ru: boolean) {
  return ru
    ? `Если захотите обсудить детали лично с командой ${name} и закрепить дату, достаточно внести предоплату ${percent}% через ${brand.name}. Это безопасно: деньги не уходят исполнителю сразу — платформа хранит их, пока обе стороны не подтвердят договорённость. Не договоритесь — предоплата вернётся полностью.`
    : `If you'd like to discuss the details with the ${name} team personally and hold the date, a ${percent}% prepayment on ${brand.name} is all it takes. It's safe: the money doesn't go to the vendor right away — the platform holds it until both sides confirm the agreement. If you don't agree, the prepayment is returned in full.`;
}

// ── No AI key: a scripted assistant that still answers from the card ──

const has = (s: string, words: string[]) => words.some((w) => s.includes(w));

export function mockVendorReply(req: VendorChatRequest): { text: string; offerIds: string[] } {
  const v = req.vendor;
  const ru = req.locale === "ru";
  const q = req.history[req.history.length - 1].text.toLowerCase();
  const offers = [...v.offers].sort((a, b) => a.price - b.price);
  const fmt = (n: number) => `${n.toLocaleString(ru ? "ru-RU" : "en-US")} ${ru ? "сом" : "som"}`;
  const date = q.match(/\b(20\d\d-\d\d-\d\d)\b/)?.[1];
  const first = req.history.filter((m) => m.from === "vendor").length === 0;
  const hello = first ? (ru ? `Здравствуйте! Это ${v.name}. ` : `Hello! This is ${v.name}. `) : "";

  if (!offers.length) {
    return { text: hello + (ru ? "Уточню у команды детали и вернусь с ответом здесь." : "Let me check with the team and get back to you here."), offerIds: [] };
  }
  if (date) {
    const free = offers.filter((o) => !o.busyDates.includes(date));
    return free.length
      ? {
          text: ru
            ? `На ${date} мы свободны: ${free[0].title} — ${fmt(free[0].price)} за ${free[0].unit}.\n\n${safePrepay(v.name, v.prepayPercent, ru)}`
            : `We are free on ${date}: ${free[0].title} — ${fmt(free[0].price)} per ${free[0].unit}.\n\n${safePrepay(v.name, v.prepayPercent, ru)}`,
          offerIds: [free[0].id],
        }
      : { text: ru ? `К сожалению, ${date} у нас уже занято. Подскажите другую дату — проверю.` : `Sorry, ${date} is already booked. Tell me another date and I'll check.`, offerIds: [] };
  }
  if (has(q, ["цен", "стои", "сколько", "прайс", "почём", "price", "cost", "how much"])) {
    // the service the client asked about («Сколько стоит «…»?» from a post), else the most affordable one
    const asked = offers.find((o) => q.includes(o.title.toLowerCase())) ?? offers[0];
    const worth = [
      v.rating >= 4 && v.reviewsCount ? (ru ? `рейтинг ${v.rating.toFixed(1)} по ${v.reviewsCount} отзывам` : `rated ${v.rating.toFixed(1)} from ${v.reviewsCount} reviews`) : "",
      v.ordersDone ? (ru ? `${v.ordersDone} проведённых событий` : `${v.ordersDone} events done`) : "",
    ]
      .filter(Boolean)
      .join(ru ? ", " : ", ");
    const others = offers.filter((o) => o.id !== asked.id).length;
    return {
      text:
        hello +
        (ru
          ? `«${asked.title}» — ${fmt(asked.price)} за ${asked.unit}. Карточку с фото прикрепил ниже${worth ? ` — у нас ${worth}` : ""}.${others ? " Есть и другие варианты — подскажу, если нужно." : ""}\n\n${safePrepay(v.name, v.prepayPercent, ru)}`
          : `"${asked.title}" — ${fmt(asked.price)} per ${asked.unit}. The card with photos is below${worth ? ` — we are ${worth}` : ""}.${others ? " We have other options too — just ask." : ""}\n\n${safePrepay(v.name, v.prepayPercent, ru)}`),
      offerIds: [asked.id],
    };
  }
  if (has(q, ["брон", "заброн", "оформ", "book", "reserve"])) {
    return {
      text: ru
        ? `С радостью. Выберите услугу ниже — дата закрепится за вами после предоплаты ${v.prepayPercent}%. Деньги хранятся на платформе и переходят нам только когда мы оба подтвердим договорённость; не договоримся — вернутся полностью.`
        : `Happy to. Pick the service below — the date is yours after a ${v.prepayPercent}% prepayment. The platform holds the money and passes it to us only when we both confirm the agreement; if we don't agree, it is returned in full.`,
      offerIds: offers.slice(0, 2).map((o) => o.id),
    };
  }
  return {
    text:
      hello +
      (ru
        ? `${v.tagline}. Подскажите дату и что именно нужно — расскажу про варианты и цены.`
        : `${v.tagline}. Tell me the date and what you need — I'll walk you through options and prices.`),
    offerIds: [],
  };
}
