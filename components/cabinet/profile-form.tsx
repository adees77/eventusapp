"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Field, Section, inputClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { updateProfile } from "@/lib/data/actions";
import { CITIES } from "@/lib/data/seed/catalog";
import { getDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";

/** Name, phone, city of the signed-in account */
export function ProfileForm() {
  const { t, l } = useI18n();
  const actor = useActor();
  const [user] = useState(() => getDB().users.find((u) => u.id === actor.id));
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [city, setCity] = useState(user?.city ?? "bishkek");
  return (
    <Section title={t("cabinet.account")}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          updateProfile(actor, { name, phone, city });
          toast.success(t("common.saved"));
        }}
      >
        <Field label={t("cabinet.name")}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={80} />
        </Field>
        <Field label={t("cabinet.phone")}>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} inputMode="tel" maxLength={32} />
        </Field>
        <Field label={t("dashboard.city")}>
          <NativeSelect value={city} onChange={(e) => setCity(e.target.value)}>
            {Object.entries(CITIES).map(([id, n]) => (
              <option key={id} value={id}>
                {l(n)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("cabinet.email")}>
          <input value={user?.email ?? "—"} disabled className={`${inputClass} text-muted-foreground`} />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" className="h-10 px-5">
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Section>
  );
}
