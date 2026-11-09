/**
 * Tool executors — run in the browser against the local store, so the AI
 * sees exactly the bookings and blocks this demo has. With Supabase these
 * would move to the server route unchanged (they only need a DB snapshot).
 */
import { addDays, format, parseISO } from "date-fns";
import { getAvailability } from "@/lib/data/availability";
import type { Actor } from "@/lib/data/policies";
import { can } from "@/lib/data/policies";
import { activeOffers, minPrice, searchVendors, type VendorResult } from "@/lib/data/queries";
import type { DB, Locale } from "@/lib/data/types";
import {
  toolInputSchemas,
  type AlternativeDate,
  type AvailabilityResult,
  type SearchResult,
  type ToolError,
  type ToolName,
  type VendorDetails,
  type VendorHit,
} from "./tool-defs";

const MAX_RESULTS = 4;

/** Colloquial model names → how they appear in offer titles */
const QUERY_SYNONYMS: [RegExp, string][] = [
  [/гелик|геленд|гелендваген|gelande|g-?wagon|g-?class|джи[- ]?класс/i, "G-Class"],
  [/эска|s-?class|эс[- ]?класс/i, "S-Class"],
  [/ешка|e-?class|е[- ]?класс/i, "E-Class"],
  [/лимузин|limo/i, "лимузин"],
];

function normalizeQuery(q?: string) {
  if (!q) return undefined;
  for (const [re, value] of QUERY_SYNONYMS) if (re.test(q)) return value;
  return q;
}

function hit(r: VendorResult, locale: Locale): VendorHit {
  const v = r.vendor;
  const cheapest = r.offers.find((o) => o.price === r.minPrice) ?? r.offers[0];
  const o = r.bestOffer;
  const a = r.bestOfferAvailability;
  return {
    vendor_id: v.id,
    slug: v.slug,
    name: v.name,
    category: v.category,
    city: v.city,
    rating: v.rating,
    reviews: v.reviewsCount,
    verified: v.verified,
    cover: v.cover,
    tagline: v.tagline[locale],
    price_from: r.minPrice,
    unit: cheapest?.unit[locale] ?? "",
    prepay_percent: v.prepayPercent,
    offer:
      o && a
        ? { offer_id: o.id, title: o.title[locale], price: o.price, unit: o.unit[locale], free: a.free, total: a.total }
        : undefined,
  };
}

function alternatives(
  db: DB,
  actor: Actor,
  input: { category?: string; date: string; qty?: number; city?: string; guests?: number },
): AlternativeDate[] {
  const base = parseISO(input.date);
  const out: AlternativeDate[] = [];
  for (const delta of [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8, 9, 10]) {
    const d = addDays(base, delta);
    if (d < new Date(new Date().toDateString())) continue;
    const iso = format(d, "yyyy-MM-dd");
    const n = searchVendors(
      db,
      {
        category: input.category as never,
        city: input.city,
        date: iso,
        qty: input.qty,
        guests: input.guests,
        onlyAvailable: true,
      },
      actor,
    ).length;
    if (n) out.push({ date: iso, vendors: n });
    if (out.length >= 3) break;
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function executeTool(
  name: string,
  rawInput: unknown,
  db: DB,
  actor: Actor,
  locale: Locale,
): SearchResult | AvailabilityResult | VendorDetails | { date: string; alternatives: AlternativeDate[] } | ToolError {
  if (!(name in toolInputSchemas)) return { error: `Unknown tool ${name}` };
  const parsed = toolInputSchemas[name as ToolName].safeParse(rawInput);
  if (!parsed.success) return { error: `Invalid input: ${parsed.error.issues.map((i) => i.message).join("; ")}` };

  switch (name as ToolName) {
    case "search_vendors": {
      const i = parsed.data as import("./tool-defs").ToolInput<"search_vendors">;
      const filters = {
        category: i.category,
        city: i.city,
        date: i.date,
        guests: i.guests,
        qty: i.qty,
        budgetMax: i.budget_max,
        query: normalizeQuery(i.query),
        onlyAvailable: Boolean(i.date),
      };
      let results = searchVendors(db, filters, actor);
      // A free-text query that matches nothing should not hide the whole category
      if (!results.length && filters.query && filters.category) results = searchVendors(db, { ...filters, query: undefined }, actor);
      const res: SearchResult = {
        date: i.date ?? null,
        qty: i.qty ?? null,
        count: results.length,
        vendors: results.slice(0, MAX_RESULTS).map((r) => hit(r, locale)),
      };
      if (i.date && !results.length) res.alternatives = alternatives(db, actor, { ...i, date: i.date });
      return res;
    }
    case "check_availability": {
      const i = parsed.data as import("./tool-defs").ToolInput<"check_availability">;
      const v = db.vendors.find((x) => x.id === i.vendor_id || x.slug === i.vendor_id);
      if (!v || !can.viewVendor(actor, v)) return { error: "Vendor not found" };
      return {
        vendor_id: v.id,
        name: v.name,
        date: i.date,
        offers: activeOffers(db, v.id).map((o) => {
          const a = getAvailability(db, o, i.date);
          return { offer_id: o.id, title: o.title[locale], price: o.price, unit: o.unit[locale], free: a.free, total: a.total };
        }),
      };
    }
    case "get_vendor": {
      const i = parsed.data as import("./tool-defs").ToolInput<"get_vendor">;
      const v = db.vendors.find((x) => x.id === i.vendor_id || x.slug === i.vendor_id);
      if (!v || !can.viewVendor(actor, v)) return { error: "Vendor not found" };
      const offers = activeOffers(db, v.id);
      const r: VendorResult = {
        vendor: v,
        offers,
        minPrice: minPrice(offers),
        availability: null,
        bestOffer: null,
        bestOfferAvailability: null,
      };
      return {
        ...hit(r, locale),
        description: v.description[locale],
        offers: offers.map((o) => ({
          offer_id: o.id,
          title: o.title[locale],
          price: o.price,
          unit: o.unit[locale],
          total: o.totalUnits,
          capacity: o.capacity,
        })),
      };
    }
    case "suggest_alternatives": {
      const i = parsed.data as import("./tool-defs").ToolInput<"suggest_alternatives">;
      return { date: i.date, alternatives: alternatives(db, actor, i) };
    }
  }
}
