"use client";

/** Platform reference data: categories and settings. Supabase: public tables, cached. */
import { getDB, useDB } from "../store";
import type { CategoryId, DB } from "../types";

export const selectCategories = (db: Pick<DB, "categories">) => [...db.categories].sort((a, b) => a.order - b.order);
export const useCategories = () => useDB(selectCategories);
export const useCategory = (id?: CategoryId) => useDB((db) => db.categories.find((c) => c.id === id));

export const usePlatformSettings = () => useDB((db) => db.settings);
/** Prices are hidden from clients until they ask in the chat (the vendor and admins still see them) */
export const usePricesHidden = () => useDB((db) => !!db.settings.hidePrices);
/** Non-reactive read, e.g. to seed a form once */
export const readPlatformSettings = () => getDB().settings;

/** How many vendors each category has (admin settings) */
export const useCategoryVendorCounts = () =>
  useDB((db) => Object.fromEntries(db.categories.map((c) => [c.id, db.vendors.filter((v) => v.category === c.id).length])) as Record<CategoryId, number>);
