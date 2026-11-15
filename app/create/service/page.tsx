"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CreateShell } from "@/components/vendor-panel/create-shell";
import { OfferForm } from "@/components/vendor-panel/offers";
import { useOwnOffer } from "@/lib/data/views/vendor";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";

/** «+» → Услуга; `?id=` edits an existing one (from the profile) */
export default function CreateServicePage() {
  return (
    <Suspense>
      <CreateService />
    </Suspense>
  );
}

function CreateService() {
  const { t } = useI18n();
  const router = useRouter();
  const id = useSearchParams().get("id");
  // only an existing offer of this vendor is edited; a stale or foreign id opens a new one
  const initial = useOwnOffer(id);
  return (
    <CreateShell title={initial ? t("vp.editOffer") : t("vp.addOffer")}>
      {(vendor) => {
        return (
          <div className="max-w-xl">
            <OfferForm key={initial?.id ?? "new"} vendor={vendor} initial={initial} onDone={() => router.push(routes.meTab("services"))} />
          </div>
        );
      }}
    </CreateShell>
  );
}
