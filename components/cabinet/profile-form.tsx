"use client";

import { useState } from "react";
import { Field, Section, inputClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { updateProfile } from "@/lib/data/actions";
import { CITIES } from "@/lib/data/seed/catalog";
import { readUser } from "@/lib/data/views/users";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { useAction } from "@/lib/data/use-action";

/** Name, phone, city of the signed-in account */
export function ProfileForm() {
  const { run } = useAction();
  const { t, l } = useI18n();
  const actor = useActor();
  const [user] = useState(() => readUser(actor.id));
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [city, setCity] = useState(user?.city ?? "bishkek");
  return (
    <Section title={t("cabinet.account")}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => updateProfile({ name, phone, city }), { success: t("common.saved") });
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
        <div className="sm:col-span-2">
          <Button type="submit" className="h-10 px-5">
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Section>
  );
}
