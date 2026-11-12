"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CreateShell } from "@/components/vendor-panel/create-shell";
import { OfferForm } from "@/components/vendor-panel/sections";
import { vendorOfOwner } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import { useActor } from "@/lib/session";
import { useI18n } from "@/lib/i18n";

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
  const actor = useActor();
  // only an existing offer of this vendor is edited; a stale or foreign id opens a new one
  const initial = useDB((db) => {
    const mine = vendorOfOwner(db, actor.id);
    return (id && mine && db.offers.find((o) => o.id === id && o.vendorId === mine.id)) || null;
  });
  return (
    <CreateShell title={initial ? t("vp.editOffer") : t("vp.addOffer")}>
      {(vendor) => {
        return (
          <div className="max-w-xl">
            <OfferForm key={initial?.id ?? "new"} vendor={vendor} initial={initial} onDone={() => router.push("/me?tab=services")} />
          </div>
        );
      }}
    </CreateShell>
  );
}
