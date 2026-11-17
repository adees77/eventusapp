"use client";

import { Footer } from "@/components/landing/footer";
import { VendorStory } from "@/components/landing/vendor-story";

/** The vendors' landing: one scroll story («be a vendor for a day»), then the footer. Open to everyone. */
export default function ForVendors() {
  return (
    <div className="min-h-dvh bg-background">
      <VendorStory />
      <Footer />
    </div>
  );
}
