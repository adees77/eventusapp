"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/category-icon";
import { Field, PageHeader, Section, inputClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { updateSettings } from "@/lib/data/actions";
import { getDB, useDataStore, useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";

export default function AdminSettings() {
  const { t, l } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const [s, setS] = useState(() => getDB().settings);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t("acab.settings")} />
      <Section title={t("acab.money")}>
        <form
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            updateSettings(actor, s);
            toast.success(t("common.saved"));
          }}
        >
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
          <div className="sm:col-span-3">
            <Button type="submit" className="h-10 px-5">
              {t("common.save")}
            </Button>
          </div>
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
