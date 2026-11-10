"use client";

import { vendorOfOwner } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import type { Vendor } from "@/lib/data/types";
import { useActor } from "@/lib/session";

/** The vendor profile of the signed-in vendor. Only call under app/vendor/layout (guarded there). */
export function useMyVendor(): Vendor {
  const actor = useActor();
  return useDB((db) => vendorOfOwner(db, actor.id)) as Vendor;
}
