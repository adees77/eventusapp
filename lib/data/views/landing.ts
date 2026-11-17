"use client";

/** Samples on the landing page. Supabase: one public RPC / cached view. */
import { activeOffers, minPrice } from "../queries";
import { useDB } from "../store";
import type { CategoryId, DB } from "../types";

const shown = (db: DB) => db.vendors.filter((v) => v.verified && !v.hidden);

/** One verified vendor per category, with its starting price */
export const selectShowcase = (db: DB, cats: CategoryId[]) =>
  cats.flatMap((cat) => {
    const vendor = shown(db).find((v) => v.category === cat);
    return vendor ? [{ vendor, priceFrom: minPrice(activeOffers(db, vendor.id)) }] : [];
  });
export const useShowcase = (cats: CategoryId[]) => useDB((db) => selectShowcase(db, cats));
