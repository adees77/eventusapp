"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Section } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { SpecsForm } from "@/components/vendor-panel/specs-form";
import { useMyVendor } from "@/components/vendor-panel/use-my-vendor";
import { updateVendor } from "@/lib/data/actions";
import { sanitizeSpecs, specFacts, specsProgress } from "@/lib/data/specs";
import type { VendorSpecs } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";

/** Category details the vendor keeps up to date: fleet, hall area, languages, inventory… */
export default function VendorDetails() {
  const { t, l } = useI18n();
  const actor = useActor();
  const vendor = useMyVendor();
  const saved = JSON.stringify(sanitizeSpecs(vendor.category, vendor.specs ?? {}));
  // the draft remembers which saved version it started from: an untouched draft follows outside changes
  // (another tab, a sync), an edited one is compared with its own starting point, not the live value
  const [draft, setDraft] = useState<{ base: string; specs: VendorSpecs }>(() => ({ base: saved, specs: vendor.specs ?? {} }));
  const clean = JSON.stringify(sanitizeSpecs(vendor.category, draft.specs));
  const dirty = clean !== draft.base;
  if (draft.base !== saved && !dirty) setDraft({ base: saved, specs: vendor.specs ?? {} });
  const specs = draft.specs;
  const setSpecs = (next: VendorSpecs) => setDraft((d) => ({ ...d, specs: next }));
  const changedElsewhere = draft.base !== saved;
  const pct = Math.round(specsProgress(vendor.category, specs) * 100);
  const facts = specFacts(vendor.category, sanitizeSpecs(vendor.category, specs));

  function save() {
    const next = sanitizeSpecs(vendor.category, specs);
    updateVendor(actor, vendor.id, { specs: next });
    setDraft({ base: JSON.stringify(next), specs: next });
    toast.success(t("common.saved"));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("vcab.details")}
        subtitle={t("vcab.detailsHint")}
        action={
          <Button className="h-10 px-5" onClick={save} disabled={!dirty}>
            {t("common.save")}
          </Button>
        }
      />
      {changedElsewhere && dirty && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-text-secondary">{t("vcab.detailsChangedElsewhere")}</p>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Section title={t("vcab.detailsForm")}>
          <SpecsForm category={vendor.category} value={specs} onChange={setSpecs} />
          <div className="mt-8 border-t border-border pt-5">
            <Button className="h-11 px-6" onClick={save} disabled={!dirty}>
              {t("common.save")}
            </Button>
          </div>
        </Section>
        <div className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
          <Section title={t("vcab.detailsFilled", { p: pct })}>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("vcab.detailsWhy")}</p>
          </Section>
          {facts.length > 0 && (
            <Section title={t("vcab.detailsFeed")}>
              <p className="text-sm">{facts.map((f) => l(f)).join(" · ")}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
