import { addDays, format, isBefore, setMonth, setDate, startOfDay, subDays } from "date-fns";
import { demoConfig } from "@/config/demo";
import type { Booking, Conversation, DB, EventItem, Message, Offer, Review, User, Vendor } from "../types";
import { hash } from "../availability";
import { CATEGORIES, REVIEW_AUTHORS, REVIEW_TEMPLATES } from "./catalog";
import { PHOTOS, unsplash } from "./photos";
import { SEED_VENDORS } from "./vendors";

export const DEMO_CLIENT_ID = "u-client";
export const DEMO_ADMIN_ID = "u-admin";
export const DEMO_VENDOR_SLUG = "altyn-kortezh";
export const demoVendorOwnerId = `u-${DEMO_VENDOR_SLUG}`;

const iso = (d: Date) => format(d, "yyyy-MM-dd");

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
  ];

  const vendors: Vendor[] = [];
  const offers: Offer[] = [];
  const reviews: Review[] = [];

  SEED_VENDORS.forEach((sv, vi) => {
    const ownerId = `u-${sv.slug}`;
    users.push({ id: ownerId, role: "vendor", name: sv.owner });
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
  ) {
    const o = offer(offerId);
    const v = vendorOf(o);
    const total = o.price * qty;
    const created = subDays(now, createdDaysAgo);
    bookings.push({
      id,
      offerId,
      vendorId: v.id,
      clientId,
      eventId,
      date: iso(date),
      qty,
      total,
      prepayAmount: Math.round((total * v.prepayPercent) / 100),
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
      text: "booking_prepaid",
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
    ],
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
          { id: "r1", name: "Жибек Абдиева", attending: true, guests: 2, createdAt: subDays(now, 2).toISOString() },
          { id: "r2", name: "Нурсултан Ибраимов", attending: true, guests: 1, note: "Буду с подарком от всего отдела", createdAt: subDays(now, 1).toISOString() },
          { id: "r3", name: "Daniel Novak", attending: false, guests: 0, note: "К сожалению, буду в отъезде", createdAt: subDays(now, 1).toISOString() },
        ],
        createdAt: subDays(now, 3).toISOString(),
        updatedAt: subDays(now, 3).toISOString(),
      },
    ],
  };
}
