import { addDays, format, isBefore, setMonth, setDate, startOfDay, subDays, subHours } from "date-fns";
import { demoConfig } from "@/config/demo";
import type { Booking, Conversation, DB, Escrow, EventItem, Message, Offer, Review, Transaction, User, Vendor } from "../types";
import { designFromLegacy } from "@/lib/invitations/design";
import { feeOf } from "@/lib/payments/escrow";
import { hash } from "../availability";
import { CATEGORIES, REVIEW_AUTHORS, REVIEW_TEMPLATES } from "./catalog";
import { PHOTOS, unsplash } from "./photos";
import { buildComments, buildPosts } from "./posts";
import { SEED_VENDORS } from "./vendors";

export const DEMO_CLIENT_ID = "u-client";
export const DEMO_ADMIN_ID = "u-admin";
export const DEMO_VENDOR_SLUG = "altyn-kortezh";
export const demoVendorOwnerId = `u-${DEMO_VENDOR_SLUG}`;

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** name, group, seats, sent (days ago, -1 = not sent), opened (hours ago, -1 = not opened) */
const SEED_GUESTS: [string, string, number, number, number][] = [
  ["Жибек Абдиева", "Друзья", 2, 3, 60],
  ["Нурсултан Ибраимов", "Коллеги", 1, 3, 30],
  ["Daniel Novak", "Коллеги", 1, 3, 28],
  ["Гульнара Сыдыкова", "Семья невесты", 2, 2, 22],
  ["Бакыт Осмонов", "Семья жениха", 4, 2, 21],
  ["Айпери Токтогулова", "Друзья", 2, 2, 15],
  ["Марат Касымов", "Семья невесты", 3, 2, 9],
  ["Алина Ким", "Друзья", 1, 1, 5],
  ["Эрлан Абдыкадыров", "Коллеги", 2, 1, 2],
  ["Чолпон Бейшеналиева", "Семья жениха", 2, 1, -1],
  ["Санжар Мамытов", "Друзья", 1, 1, -1],
  ["Нуриза Алиева", "Семья невесты", 2, -1, -1],
  ["Азамат Усенов", "Коллеги", 1, -1, -1],
];

/** Next occurrence of the given month/day (month 0-based) from today */
export function nextDate(month: number, day: number, from = new Date()): Date {
  const today = startOfDay(from);
  let d = setDate(setMonth(today, month), day);
  if (isBefore(d, today)) d = setDate(setMonth(new Date(today.getFullYear() + 1, 0, 1), month), day);
  return d;
}

export function buildSeed(now = new Date()): DB {
  const users: User[] = [
    { id: DEMO_CLIENT_ID, role: "client", name: "Айгерим Касымова", phone: "+996 700 000 001" },
    { id: DEMO_ADMIN_ID, role: "admin", name: "Команда EVENTUS" },
    { id: "u-client-2", role: "client", name: "Нурсултан Ибраимов" },
    { id: "u-client-3", role: "client", name: "Жибек Абдиева" },
    { id: "u-client-4", role: "client", name: "Daniel Novak" },
    { id: "u-client-5", role: "client", name: "Асель Мамбетова" },
    { id: "u-client-6", role: "client", name: "Тимур Жээнбеков" },
  ];
  users.forEach((u, i) => (u.createdAt = subDays(now, 40 - i * 6).toISOString()));

  const vendors: Vendor[] = [];
  const offers: Offer[] = [];
  const reviews: Review[] = [];

  SEED_VENDORS.forEach((sv, vi) => {
    const ownerId = `u-${sv.slug}`;
    users.push({ id: ownerId, role: "vendor", name: sv.owner, createdAt: subDays(now, 31 + vi * 3).toISOString() });
    const set = PHOTOS[sv.photoSet];
    const extra = sv.extraSet ? PHOTOS[sv.extraSet] : [];
    const portfolio = [...set, ...extra.slice(0, 4)].map((id) => unsplash(id, 1200));
    const vendorId = `v-${sv.slug}`;

    vendors.push({
      id: vendorId,
      ownerId,
      slug: sv.slug,
      name: sv.name,
      category: sv.category,
      city: sv.city,
      tagline: sv.tagline,
      description: sv.description,
      rating: sv.rating,
      reviewsCount: sv.reviews,
      verified: sv.verified,
      hidden: false,
      prepayPercent: sv.prepay ?? demoConfig.defaultPrepayPercent,
      cover: unsplash(set[sv.cover ?? 0], 1600, 900),
      portfolio,
      phone: `+996 555 ${100 + (hash(sv.slug) % 900)} ${100 + ((hash(sv.slug) >>> 10) % 900)}`,
      instagram: sv.instagram,
      yearsOnMarket: sv.years,
      responseMinutes: sv.response,
      createdAt: subDays(now, 30 + vi * 3).toISOString(),
    });

    sv.offers.forEach((so, oi) => {
      offers.push({
        id: `o-${sv.slug}-${oi + 1}`,
        vendorId,
        title: so.title,
        description: so.description,
        price: so.price,
        unit: so.unit,
        totalUnits: so.units,
        maxPerBooking: so.maxPerBooking,
        capacity: so.capacity,
        photos: so.photos.map((i) => unsplash(set[i % set.length], 900, 675)),
        premium: so.premium,
        active: true,
      });
    });

    // 4–6 visible reviews per vendor, deterministic
    const n = 4 + (hash(sv.slug) % 3);
    for (let i = 0; i < n; i++) {
      const t = REVIEW_TEMPLATES[(hash(`${sv.slug}:${i}`) >>> 3) % REVIEW_TEMPLATES.length];
      reviews.push({
        id: `r-${sv.slug}-${i}`,
        vendorId,
        author: REVIEW_AUTHORS[(vi + i * 5) % REVIEW_AUTHORS.length],
        rating: sv.rating >= 4.9 ? 5 : t.rating,
        text: t.text,
        date: iso(subDays(now, 10 + i * 23 + (hash(sv.slug) % 15))),
      });
    }
  });

  const offer = (id: string) => offers.find((o) => o.id === id)!;
  const vendorOf = (o: Offer) => vendors.find((v) => v.id === o.vendorId)!;

  // ── Demo client's event & existing bookings ──
  const weddingDate = nextDate(5, 14, now); // 14 June
  const event: EventItem = {
    id: "e-wedding",
    clientId: DEMO_CLIENT_ID,
    title: "Свадьба Айгерим и Тимура",
    date: iso(weddingDate),
    city: "bishkek",
    guests: 150,
    budget: 1500000,
    createdAt: subDays(now, 5).toISOString(),
    checklist: [
      { id: "c1", title: "Банкетный зал", done: true, category: "halls" },
      { id: "c2", title: "Кортеж", done: false, category: "cars" },
      { id: "c3", title: "Ведущий", done: false, category: "hosts" },
      { id: "c4", title: "Фото и видео", done: false, category: "photo" },
      { id: "c5", title: "Декор зала", done: false, category: "decor" },
      { id: "c6", title: "Торт", done: false, category: "cakes" },
      { id: "c7", title: "Образ невесты", done: false, category: "beauty" },
    ],
  };

  const bookings: Booking[] = [];
  const transactions: Transaction[] = [];
  const FEE = 5;
  const conversations: Conversation[] = [];
  const messages: Message[] = [];

  function addBooking(
    id: string,
    offerId: string,
    clientId: string,
    date: Date,
    qty: number,
    status: Booking["status"],
    createdDaysAgo: number,
    chat: { from: "client" | "vendor"; text: string; minutesAgo: number }[],
    eventId?: string,
    deal?: { client?: boolean; vendor?: boolean; dispute?: string },
  ) {
    const o = offer(offerId);
    const v = vendorOf(o);
    const total = o.price * qty;
    const created = subDays(now, createdDaysAgo);
    const prepayAmount = Math.round((total * v.prepayPercent) / 100);
    const at = (h: number) => new Date(created.getTime() + h * 3600000).toISOString();
    let escrow: Escrow | undefined;
    if (status !== "pending") {
      const tx = (kind: Transaction["kind"], amount: number, h: number) =>
        transactions.push({ id: `tx-${id}-${kind}`, kind, amount, bookingId: id, vendorId: v.id, clientId, createdAt: at(h) });
      tx("hold", prepayAmount, 0);
      const released = status === "confirmed" || status === "completed";
      escrow = {
        state: deal?.dispute ? "disputed" : released ? "released" : "held",
        amount: prepayAmount,
        heldAt: at(0),
        clientConfirmedAt: released || deal?.client ? at(2) : undefined,
        vendorConfirmedAt: released || deal?.vendor ? at(3) : undefined,
        releasedAt: released ? at(3) : undefined,
        dispute: deal?.dispute ? { by: clientId, reason: deal.dispute, openedAt: at(20) } : undefined,
      };
      if (released) {
        tx("release", prepayAmount - feeOf(prepayAmount, FEE), 3);
        tx("fee", feeOf(prepayAmount, FEE), 3);
      }
    }
    bookings.push({
      escrow,
      id,
      offerId,
      vendorId: v.id,
      clientId,
      eventId,
      date: iso(date),
      qty,
      total,
      prepayAmount,
      status,
      paymentRef: status === "pending" ? undefined : `DEMO-${id.toUpperCase()}`,
      createdAt: created.toISOString(),
    });
    const convId = `c-${id}`;
    const lastMin = chat.length ? chat[chat.length - 1].minutesAgo : createdDaysAgo * 1440;
    const updated = new Date(now.getTime() - lastMin * 60000).toISOString();
    conversations.push({
      id: convId,
      clientId,
      vendorId: v.id,
      bookingId: id,
      createdAt: created.toISOString(),
      updatedAt: updated,
      readAt: { [clientId]: updated, [v.ownerId]: updated },
    });
    messages.push({
      id: `m-${id}-sys`,
      conversationId: convId,
      senderId: "system",
      text: "escrow_held",
      system: true,
      createdAt: created.toISOString(),
    });
    chat.forEach((m, i) => {
      messages.push({
        id: `m-${id}-${i}`,
        conversationId: convId,
        senderId: m.from === "client" ? clientId : v.ownerId,
        text: m.text,
        createdAt: new Date(now.getTime() - m.minutesAgo * 60000).toISOString(),
      });
    });
  }

  // Client already booked a hall for the wedding
  addBooking(
    "b-hall",
    "o-ordo-palace-2",
    DEMO_CLIENT_ID,
    weddingDate,
    1,
    "confirmed",
    4,
    [
      { from: "client", text: "Здравствуйте! Можно приехать посмотреть зал в субботу?", minutesAgo: 5600 },
      { from: "vendor", text: "Здравствуйте, Айгерим! Конечно, ждём вас в субботу в 12:00. Покажем зал и обсудим меню.", minutesAgo: 5580 },
      { from: "client", text: "Отлично, спасибо!", minutesAgo: 5570 },
    ],
    event.id,
  );

  // Incoming bookings for the demo vendor (Altyn Kortezh)
  addBooking(
    "b-ak-1",
    "o-altyn-kortezh-1",
    "u-client-2",
    addDays(now, 12),
    5,
    "prepaid",
    2,
    [
      { from: "client", text: "Добрый день! Нам нужно 5 машин к 10:00 к ресторану «Ордо».", minutesAgo: 2800 },
      { from: "vendor", text: "Добрый день, Нурсултан! Записали: 5 G-Class к 10:00. За день до свадьбы водитель-координатор позвонит.", minutesAgo: 2790 },
      { from: "client", text: "Всё верно, подтверждаю сделку со своей стороны.", minutesAgo: 2700 },
    ],
    undefined,
    { client: true },
  );
  addBooking(
    "b-ak-2",
    "o-altyn-kortezh-3",
    "u-client-3",
    addDays(now, 26),
    1,
    "prepaid",
    1,
    [{ from: "client", text: "Можно оформить капот белыми пионами?", minutesAgo: 95 }],
  );
  addBooking(
    "b-ak-3",
    "o-altyn-kortezh-2",
    "u-client-4",
    addDays(now, 40),
    3,
    "pending",
    0,
    [],
  );

  // A few historical completed bookings for stats
  addBooking("b-ak-old-1", "o-altyn-kortezh-1", "u-client-3", subDays(now, 20), 4, "completed", 50, []);
  addBooking("b-ak-old-2", "o-altyn-kortezh-2", "u-client-2", subDays(now, 9), 6, "completed", 40, []);

  // A deal under dispute — shows the admin flow
  addBooking(
    "b-dispute",
    "o-kadr-studio-1",
    "u-client-5",
    subDays(now, 3),
    1,
    "prepaid",
    25,
    [
      { from: "client", text: "Здравствуйте! Прошло уже три дня, а фотографий так и нет.", minutesAgo: 1900 },
      { from: "vendor", text: "Добрый день! По договору срок — 10 рабочих дней.", minutesAgo: 1880 },
      { from: "client", text: "Мы договаривались на превью через 3 дня. Открываю спор.", minutesAgo: 1860 },
    ],
    undefined,
    { client: false, dispute: "Обещали превью через 3 дня после съёмки, срок прошёл, фотографий нет." },
  );
  // Older released deals of other vendors → platform revenue in admin
  addBooking("b-x-1", "o-sapfir-hall-1", "u-client-6", subDays(now, 15), 1, "completed", 60, []);
  addBooking("b-x-2", "o-tamada-erkin-1", "u-client-6", subDays(now, 15), 1, "completed", 55, []);
  addBooking("b-x-3", "o-sweet-tenir-1", "u-client-4", subDays(now, 6), 1, "completed", 28, []);
  addBooking("b-x-4", "o-aruu-films-1", "u-client-2", addDays(now, 18), 1, "prepaid", 6, []);

  const posts = buildPosts(SEED_VENDORS, vendors, offers, now);

  const stats = vendors.map((v) => ({ vendorId: v.id, views: 120 + (hash(v.id) % 2400) }));

  return {
    version: demoConfig.seedVersion,
    users,
    categories: CATEGORIES,
    vendors,
    offers,
    blocks: [],
    bookings,
    events: [event],
    conversations,
    messages,
    reviews,
    favorites: [
      { userId: DEMO_CLIENT_ID, vendorId: "v-kadr-studio" },
      { userId: DEMO_CLIENT_ID, vendorId: "v-bouquet-atelier" },
    ],
    stats,
    posts,
    comments: buildComments(posts, reviews, now),
    likes: posts.filter((_, i) => i % 9 === 0).slice(0, 6).map((p) => ({ userId: DEMO_CLIENT_ID, postId: p.id })),
    saved: posts.filter((_, i) => i % 13 === 4).slice(0, 5).map((p) => ({ userId: DEMO_CLIENT_ID, postId: p.id })),
    follows: [
      { userId: DEMO_CLIENT_ID, vendorId: "v-kadr-studio" },
      { userId: DEMO_CLIENT_ID, vendorId: "v-bouquet-atelier" },
      { userId: DEMO_CLIENT_ID, vendorId: "v-ordo-palace" },
      { userId: "u-client-2", vendorId: "v-altyn-kortezh" },
      { userId: "u-client-3", vendorId: "v-altyn-kortezh" },
    ],
    transactions,
    notifications: [
      {
        id: "n-seed-1",
        userId: demoVendorOwnerId,
        kind: "escrow_confirm",
        text: { ru: "Нурсултан подтвердил сделку — осталось ваше подтверждение", en: "Nursultan confirmed the deal — your confirmation is next" },
        href: "/messages/c-b-ak-1",
        read: false,
        createdAt: new Date(now.getTime() - 2700 * 60000).toISOString(),
      },
      {
        id: "n-seed-2",
        userId: DEMO_CLIENT_ID,
        kind: "rsvp",
        text: { ru: "Нурсултан Ибраимов придёт", en: "Nursultan Ibraimov is coming" },
        href: "/invitations/inv-wedding?tab=stats",
        read: false,
        createdAt: subDays(now, 1).toISOString(),
      },
      {
        id: "n-seed-3",
        userId: DEMO_ADMIN_ID,
        kind: "escrow_disputed",
        text: { ru: "Открыт спор по сделке с Kadr Studio", en: "A dispute was opened with Kadr Studio" },
        href: "/admin/disputes",
        read: false,
        createdAt: subDays(now, 1).toISOString(),
      },
    ],
    settings: { feePercent: FEE, defaultPrepayPercent: demoConfig.defaultPrepayPercent, autoReleaseDays: 3 },
    invitations: [
      {
        id: "inv-wedding",
        ownerId: DEMO_CLIENT_ID,
        eventId: event.id,
        templateId: "t-wedding-classic",
        style: "classic",
        occasion: "wedding",
        heading: "Приглашение на свадьбу",
        names: "Айгерим и Тимур",
        message: "С радостью приглашаем вас разделить с нами самый важный день — день нашей свадьбы.",
        date: event.date,
        time: "17:00",
        venue: "Ресторан «Ордо»",
        address: "Бишкек, пр. Чуй, 219",
        dressCode: "Вечерний, пастельные тона",
        contact: "+996 700 000 001",
        rsvps: [
          { id: "r1", guestId: "g1", name: "Жибек Абдиева", attending: true, guests: 2, createdAt: subDays(now, 2).toISOString() },
          { id: "r2", guestId: "g2", name: "Нурсултан Ибраимов", attending: true, guests: 1, note: "Буду с подарком от всего отдела", createdAt: subDays(now, 1).toISOString() },
          { id: "r3", guestId: "g3", name: "Daniel Novak", attending: false, guests: 0, note: "К сожалению, буду в отъезде", createdAt: subDays(now, 1).toISOString() },
          { id: "r4", guestId: "g5", name: "Бакыт Осмонов", attending: true, guests: 4, createdAt: subHours(now, 20).toISOString() },
          { id: "r5", name: "Эльвира (подруга)", attending: true, guests: 2, createdAt: subHours(now, 6).toISOString() },
        ],
        design: designFromLegacy({
          style: "classic",
          occasion: "wedding",
          heading: "Приглашение на свадьбу",
          names: "Айгерим и Тимур",
          message: "С радостью приглашаем вас разделить с нами самый важный день — день нашей свадьбы.",
          dressCode: "Вечерний, пастельные тона",
          contact: "+996 700 000 001",
        }),
        guests: SEED_GUESTS.map(([name, group, seats, sent, opened], i) => ({
          id: `g${i + 1}`,
          name,
          group,
          seats,
          sentAt: sent >= 0 ? subDays(now, sent).toISOString() : undefined,
          openedAt: opened >= 0 ? subHours(now, opened).toISOString() : undefined,
        })),
        views: Array.from({ length: 46 }, (_, i) => ({
          at: subHours(now, Math.round((i * i) / 30) + (i % 5)).toISOString(),
          guestId: i < 9 ? `g${(i % 9) + 1}` : undefined,
        })),
        createdAt: subDays(now, 3).toISOString(),
        updatedAt: subDays(now, 3).toISOString(),
      },
    ],
  };
}
