"use client";

import { PageHeader } from "@/components/panel";
import { VendorProfileForm } from "@/components/vendor-panel/sections";
import { useMyVendor } from "@/components/vendor-panel/use-my-vendor";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  const vendor = useMyVendor();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("vcab.settings")} />
      <VendorProfileForm key={vendor.id} vendor={vendor} />
    </div>
  );
}
