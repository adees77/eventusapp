import type { VendorChatRequest } from "./vendor-protocol";

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
            ? `На ${date} мы свободны: ${free[0].title} — ${fmt(free[0].price)} за ${free[0].unit}. Могу закрепить дату за вами — бронь с предоплатой ${v.prepayPercent}% через платформу.`
            : `We are free on ${date}: ${free[0].title} — ${fmt(free[0].price)} per ${free[0].unit}. I can hold the date for you — booking with a ${v.prepayPercent}% prepayment on the platform.`,
          offerIds: [free[0].id],
        }
      : { text: ru ? `К сожалению, ${date} у нас уже занято. Подскажите другую дату — проверю.` : `Sorry, ${date} is already booked. Tell me another date and I'll check.`, offerIds: [] };
  }
  if (has(q, ["цен", "стои", "сколько", "прайс", "почём", "price", "cost", "how much"])) {
    const list = offers
      .slice(0, 3)
      .map((o) => `${o.title} — ${fmt(o.price)} ${ru ? "за" : "per"} ${o.unit}`)
      .join(ru ? "; " : "; ");
    return {
      text:
        hello +
        (ru
          ? `По ценам: ${list}. На какую дату планируете? Проверю, свободны ли мы, и посчитаю точно.`
          : `Our prices: ${list}. What date are you planning? I'll check availability and give the exact total.`),
      offerIds: [],
    };
  }
  if (has(q, ["брон", "заброн", "оформ", "book", "reserve"])) {
    return {
      text: ru
        ? `Отлично, оформим. Выберите услугу ниже — дата закрепится за вами после предоплаты ${v.prepayPercent}%, деньги хранятся на платформе до подтверждения сделки.`
        : `Great, let's book. Pick the service below — the date is yours after a ${v.prepayPercent}% prepayment, held by the platform until the deal is confirmed.`,
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
