"use client";

/** Profiles. Supabase: `profiles` (own row in full, others — public fields only). */
import { getDB, useDB } from "../store";

export const useUser = (id?: string | null) => useDB((db) => (id ? db.users.find((u) => u.id === id) : undefined));
/** Non-reactive read, e.g. right after sign-in or to seed a form once */
export const readUser = (id?: string | null) => (id ? getDB().users.find((u) => u.id === id) : undefined);
