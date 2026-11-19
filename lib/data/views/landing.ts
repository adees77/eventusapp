"use client";

/** Samples on the landing page: always from the demo catalog. */
import { useMemo } from "react";
import { activeOffers, minPrice } from "../queries";
import { buildSeed } from "../seed";
import type { CategoryId, DB } from "../types";

const shown = (db: DB) => db.vendors.filter((v) => v.verified && !v.hidden);

/** One verified vendor per category, with its starting price */
export const selectShowcase = (db: DB, cats: CategoryId[]) =>
  cats.flatMap((cat) => {
    const vendor = shown(db).find((v) => v.category === cat);
    return vendor ? [{ vendor, priceFrom: minPrice(activeOffers(db, vendor.id)) }] : [];
  });
/**
 * The landing is marketing, not data: its mockups always show the demo catalog, so they look the same
 * in the demo and in live mode (where the catalog starts empty).
 */
let demoCatalog: DB | undefined;
export function useShowcase(cats: CategoryId[]) {
  const key = cats.join();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for `cats`
  return useMemo(() => selectShowcase((demoCatalog ??= buildSeed()), cats), [key]);
}
