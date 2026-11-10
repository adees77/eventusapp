"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ProfileForm } from "@/components/cabinet/profile-form";
import { PageHeader, Section } from "@/components/panel";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";

export default function ClientProfile() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState({ deals: true, rsvp: true, posts: false });
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title={t("cabinet.profile")} />
      <ProfileForm />
      <Section title={t("cabinet.notifications")}>
        <ul className="flex flex-col divide-y divide-border">
          {(["deals", "rsvp", "posts"] as const).map((k) => (
            <li key={k} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <span className="text-sm">{t(`cabinet.pref.${k}`)}</span>
              <Switch
                checked={prefs[k]}
                onCheckedChange={(v: boolean) => {
                  setPrefs((p) => ({ ...p, [k]: v }));
                  toast.success(t("common.saved"));
                }}
              />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
