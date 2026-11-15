"use client";

import type { Vendor } from "@/lib/data/types";
import { useOwnVendor } from "@/lib/data/views/vendor";

/** The vendor profile of the signed-in vendor. Only call under app/vendor/layout (guarded there). */
export function useMyVendor(): Vendor {
  return useOwnVendor() as Vendor;
}
