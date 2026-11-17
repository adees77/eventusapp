"use client";

/**
 * The bridge that keeps a real account recognisable before stage 4 moves all
 * data to Supabase: the outcome of onboarding is written to the server (the
 * same RPCs the backend already has), and on sign-in in a new browser, on a
 * phone or after cleared site data, the account is read back from there — so a
 * returning user is never sent through onboarding again.
 *
 * Every call is best effort: the local store stays the source of truth for
 * the UI, a network failure only means the account is not mirrored yet.
 */
import { getMode } from "@/lib/demo/mode";
import type { Json } from "@/lib/supabase/database.types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { CategoryId, ChecklistItem, EventItem, LText, Offer, Post, Role, Vendor, VendorSpecs } from "./types";

/** Real accounts in live mode: the only case where the server knows this user */
export const remoteAccounts = () => getMode() === "live" && isSupabaseConfigured();

/** Photos as data URLs are too heavy for the server row: only links go there */
const links = (photos: string[]) => photos.filter((p) => /^https?:\/\//.test(p));

export async function pushClientOnboarding(input: {
  name: string;
  city: string;
  event: { title: string; date: string; guests: number; budget: number };
  checklist: ChecklistItem[];
}) {
  if (!remoteAccounts()) return;
  try {
    const { error } = await supabase().rpc("complete_client_onboarding", { p: input as unknown as Json });
    if (error) console.warn("[remote] client onboarding", error.message);
  } catch (e) {
    console.warn("[remote] client onboarding", e);
  }
}

export async function pushVendorSignUp(input: {
  ownerName: string;
  vendor: Vendor;
  offer: { title: string; price: number; unit: LText };
}) {
  if (!remoteAccounts()) return;
  const v = input.vendor;
  const portfolio = links(v.portfolio);
  const p = {
    ownerName: input.ownerName,
    name: v.name,
    category: v.category,
    city: v.city,
    phone: v.phone,
    tagline: v.tagline.ru,
    specs: v.specs ?? {},
    photos: portfolio.slice(0, 10),
    portfolio,
    cover: links([v.cover])[0] ?? portfolio[0] ?? "",
    offer: input.offer,
  };
  try {
    const { error } = await supabase().rpc("sign_up_vendor", { p: p as unknown as Json });
    if (error) console.warn("[remote] vendor sign-up", error.message);
  } catch (e) {
    console.warn("[remote] vendor sign-up", e);
  }
}

/** What the server knows about an account, in local shapes */
export interface RemoteAccount {
  role: Role;
  name: string;
  phone?: string;
  city?: string;
  onboardedAt?: string;
  events: EventItem[];
  vendor?: Vendor;
  offers: Offer[];
  posts: Post[];
}

const ltext = (j: Json | null | undefined): LText => {
  const o = (j ?? {}) as { ru?: string; en?: string };
  return { ru: o.ru ?? "", en: o.en ?? o.ru ?? "" };
};

/**
 * The account as the server has it; "onboarding" → the server has not seen it
 * finish onboarding yet; null → no answer (not a real account, offline).
 */
export async function pullAccount(userId: string): Promise<RemoteAccount | "onboarding" | null> {
  if (!remoteAccounts()) return null;
  const db = supabase();
  const { data: profile, error } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error || !profile) return null;
  if (profile.needs_onboarding) return "onboarding";

  const { data: events } = await db.from("events").select("*").eq("client_id", userId).order("date");
  const account: RemoteAccount = {
    role: profile.role,
    name: profile.name,
    phone: profile.phone ?? undefined,
    city: profile.city ?? undefined,
    onboardedAt: profile.onboarded_at ?? undefined,
    events: (events ?? []).map((e) => ({
      id: e.id,
      clientId: e.client_id,
      title: e.title,
      date: e.date,
      city: e.city,
      guests: e.guests,
      budget: e.budget,
      checklist: Array.isArray(e.checklist) ? (e.checklist as unknown as ChecklistItem[]) : [],
      createdAt: e.created_at,
    })),
    offers: [],
    posts: [],
  };

  if (profile.role === "vendor") {
    const { data: v } = await db.from("vendors").select("*").eq("owner_id", userId).maybeSingle();
    if (v) {
      account.vendor = {
        id: v.id,
        ownerId: v.owner_id,
        slug: v.slug,
        name: v.name,
        category: v.category as CategoryId,
        city: v.city,
        tagline: ltext(v.tagline),
        description: ltext(v.description),
        rating: v.rating,
        reviewsCount: v.reviews_count,
        verified: v.verified,
        hidden: v.hidden,
        prepayPercent: v.prepay_percent,
        aiAssistant: v.ai_assistant,
        cover: v.cover,
        portfolio: v.portfolio,
        phone: v.phone,
        instagram: v.instagram ?? undefined,
        yearsOnMarket: v.years_on_market,
        responseMinutes: v.response_minutes,
        createdAt: v.created_at,
        specs: (v.specs ?? {}) as VendorSpecs,
        ordersBase: v.orders_base,
      };
      const [{ data: offers }, { data: posts }] = await Promise.all([
        db.from("offers").select("*").eq("vendor_id", v.id),
        db.from("posts").select("*").eq("vendor_id", v.id),
      ]);
      account.offers = (offers ?? []).map((o) => ({
        id: o.id,
        vendorId: o.vendor_id,
        title: ltext(o.title),
        description: ltext(o.description),
        price: o.price,
        unit: ltext(o.unit),
        totalUnits: o.total_units,
        maxPerBooking: o.max_per_booking ?? undefined,
        capacity: o.capacity ?? undefined,
        photos: o.photos,
        premium: o.premium,
        active: o.active,
      }));
      account.posts = (posts ?? []).map((p) => ({
        id: p.id,
        vendorId: p.vendor_id,
        photos: p.photos,
        caption: ltext(p.caption),
        category: p.category as CategoryId,
        offerId: p.offer_id ?? undefined,
        baseLikes: p.base_likes,
        ratio: p.ratio,
        hidden: p.hidden,
        createdAt: p.created_at,
      }));
    }
  }
  return account;
}
