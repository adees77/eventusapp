"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/category-icon";
import { Field, PageHeader, Section, inputClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { DOC_KINDS, updateSettings } from "@/lib/data/actions";
import { getDB, useDataStore, useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export default function AdminSettings() {
  const { t, l } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const [s, setS] = useState(() => getDB().settings);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(actor, s);
    setS(getDB().settings);
    toast.success(t("common.saved"));
  };
  const saveBtn = (
    <div className="sm:col-span-3">
      <Button type="submit" className="h-10 px-5">
        {t("common.save")}
      </Button>
    </div>
  );
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t("acab.settings")} />
      <Section title={t("acab.money")}>
        <form className="grid gap-4 sm:grid-cols-3" onSubmit={save}>
          <Field label={t("acab.feePercent")} hint={t("acab.feeHint")}>
            <input
              type="number"
              min={0}
              max={30}
              value={s.feePercent}
              onChange={(e) => setS({ ...s, feePercent: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label={t("acab.prepayDefault")} hint={t("acab.prepayHint")}>
            <input
              type="number"
              min={0}
              max={100}
              value={s.defaultPrepayPercent}
              onChange={(e) => setS({ ...s, defaultPrepayPercent: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label={t("acab.autoRelease")} hint={t("acab.autoReleaseHint")}>
            <input
              type="number"
              min={0}
              max={60}
              value={s.autoReleaseDays}
              onChange={(e) => setS({ ...s, autoReleaseDays: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          {saveBtn}
        </form>
      </Section>

      <Section title={t("mod.setVerification")}>
        <form className="grid gap-4 sm:grid-cols-3" onSubmit={save}>
          <div className="sm:col-span-3">
            <div className="mb-2 text-sm">{t("mod.requiredDocs")}</div>
            <div className="flex flex-wrap gap-1.5">
              {DOC_KINDS.map((k) => {
                const on = s.requiredDocs.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setS({ ...s, requiredDocs: on ? s.requiredDocs.filter((x) => x !== k) : [...s.requiredDocs, k] })}
                    className={cn(
                      "h-9 rounded-full px-4 text-sm transition-colors",
                      on ? "bg-ink text-white" : "bg-foreground/[0.05] text-text-secondary hover:bg-foreground/[0.09]",
                    )}
                  >
                    {t(`mod.docKind.${k}`)}
                  </button>
                );
              })}
            </div>
          </div>
          <Toggle
            className="sm:col-span-3"
            checked={s.hideUnverified}
            onChange={(v) => setS({ ...s, hideUnverified: v })}
            label={t("mod.hideUnverified")}
            hint={t("mod.hideUnverifiedHint")}
          />
          {saveBtn}
        </form>
      </Section>

      <Section title={t("mod.setModeration")}>
        <form className="grid gap-4 sm:grid-cols-3" onSubmit={save}>
          <Field label={t("mod.autoHide")} hint={t("mod.autoHideHint")}>
            <input
              type="number"
              min={0}
              max={20}
              value={s.autoHideComplaints}
              onChange={(e) => setS({ ...s, autoHideComplaints: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label={t("mod.lowRating")} hint={t("mod.lowRatingHint")}>
            <input
              type="number"
              min={1}
              max={4}
              value={s.lowRatingThreshold}
              onChange={(e) => setS({ ...s, lowRatingThreshold: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Toggle
            className="sm:col-span-3"
            checked={s.notifyOnComplaint}
            onChange={(v) => setS({ ...s, notifyOnComplaint: v })}
            label={t("mod.notifyComplaint")}
          />
          {saveBtn}
        </form>
      </Section>

      <Section title={t("mod.setSupport")}>
        <form className="grid gap-4 sm:grid-cols-3" onSubmit={save}>
          <Field label={t("mod.supportPhone")}>
            <input type="tel" value={s.supportPhone} onChange={(e) => setS({ ...s, supportPhone: e.target.value })} className={inputClass} maxLength={40} />
          </Field>
          <Field label={t("mod.supportEmail")} hint={t("mod.supportHint")}>
            <input type="email" value={s.supportEmail} onChange={(e) => setS({ ...s, supportEmail: e.target.value })} className={inputClass} maxLength={80} />
          </Field>
          {saveBtn}
        </form>
      </Section>
      <Section title={t("feed.categories")}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {[...db.categories]
            .sort((a, b) => a.order - b.order)
            .map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm bg-foreground/[0.045]">
                <CategoryIcon id={c.id} className="size-4 text-muted-foreground" />
                <span className="flex-1">{l(c.name)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{db.vendors.filter((v) => v.category === c.id).length}</span>
              </li>
            ))}
        </ul>
      </Section>
      <Section title={t("acab.demoData")}>
        <p className="text-sm text-text-secondary">{t("acab.demoDataHint")}</p>
        <Button
          variant="outline"
          className="mt-4 h-10 px-4"
          onClick={() => {
            if (!window.confirm(t("demo.resetConfirm"))) return;
            useDataStore.getState().resetDemo();
            toast.success(t("demo.resetDone"));
          }}
        >
          {t("demo.reset")}
        </Button>
      </Section>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-foreground/[0.035] px-4 py-3", className)}>
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-foreground/15 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
      />
    </label>
  );
}
