"use client";

import { Pencil } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { SpecSheet } from "@/components/vendor/spec-sheet";
import { specsProgress } from "@/lib/data/specs";
import type { Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";

/** Vendor page, «Подробно»: category details (fleet, halls, menu…) */
export function DetailsTab({ vendor, isOwner }: { vendor: Vendor; isOwner: boolean }) {
  const { t } = useI18n();
  return (
    <div className="container-app py-2">
      {isOwner && (
        <div className="mb-6 flex justify-end">
          <LinkButton href={routes.vendorDetails} variant="outline" className="h-9 px-4">
            <Pencil strokeWidth={1.75} />
            {t("owner.editDetails")}
          </LinkButton>
        </div>
      )}
      {/* any filled field counts — specFacts only covers the few fields shown in the feed */}
      {specsProgress(vendor.category, vendor.specs) > 0 ? (
        <SpecSheet category={vendor.category} specs={vendor.specs} />
      ) : (
        <p className="py-16 text-center text-sm text-text-secondary">{isOwner ? t("owner.noDetails") : t("profile.noDetails")}</p>
      )}
    </div>
  );
}
