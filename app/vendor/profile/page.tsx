"use client";

import { AccountSection } from "@/components/cabinet/account-section";
import { PageHeader } from "@/components/panel";
import { VendorDocuments } from "@/components/vendor-panel/documents";
import { VendorProfileForm } from "@/components/vendor-panel/profile-form";
import { useMyVendor } from "@/components/vendor-panel/use-my-vendor";
import { useI18n } from "@/lib/i18n";

export default function Page() {
  const { t } = useI18n();
  const vendor = useMyVendor();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("vcab.settings")} />
      <VendorDocuments vendor={vendor} />
      <VendorProfileForm key={vendor.id} vendor={vendor} />
      <AccountSection />
    </div>
  );
}
