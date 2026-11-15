"use client";

/** Vendor company profile form */
import { Plus, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Field, Section, inputClass, textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { updateVendor } from "@/lib/data/actions";
import type { Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";

export function VendorProfileForm({ vendor }: { vendor: Vendor }) {
  const { t, locale } = useI18n();
  const [name, setName] = useState(vendor.name);
  const [tagline, setTagline] = useState(vendor.tagline[locale]);
  const [description, setDescription] = useState(vendor.description[locale]);
  const [phone, setPhone] = useState(vendor.phone);
  const [prepay, setPrepay] = useState(String(vendor.prepayPercent));
  const [portfolio, setPortfolio] = useState(vendor.portfolio);
  const [url, setUrl] = useState("");

  function addPhoto() {
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "https:" || u.hostname !== "images.unsplash.com") throw new Error();
      setPortfolio((p) => [...p, u.toString()]);
      setUrl("");
    } catch {
      toast.error("https://images.unsplash.com/…");
    }
  }

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_1fr]"
      onSubmit={(e) => {
        e.preventDefault();
        updateVendor(vendor.id, {
          name: name.trim().slice(0, 80) || vendor.name,
          tagline: { ...vendor.tagline, [locale]: tagline.trim().slice(0, 120) },
          description: { ...vendor.description, [locale]: description.trim().slice(0, 1500) },
          phone: phone.trim().slice(0, 30),
          prepayPercent: Number(prepay),
          portfolio,
          cover: portfolio[0] ?? vendor.cover,
        });
        toast.success(t("common.saved"));
      }}
    >
      <Section title={t("vp.profile")}>
        <div className="flex flex-col gap-4">
          <Field label={t("vp.name")}>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={80} />
          </Field>
          <Field label={t("vp.tagline")}>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} maxLength={120} />
          </Field>
          <Field label={t("vp.descriptionLabel")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className={textareaClass}
              maxLength={1500}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("vp.phone")}>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} inputMode="tel" maxLength={30} />
            </Field>
            <Field label={t("vp.prepayPercent")}>
              <input type="number" min={0} max={100} value={prepay} onChange={(e) => setPrepay(e.target.value)} className={inputClass} />
            </Field>
          </div>
        </div>
      </Section>
      <Section title={t("vendor.portfolio")}>
        <div className="grid grid-cols-3 gap-2">
          {portfolio.map((p) => (
            <div key={p} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
              <Image src={p} alt="" fill sizes="120px" className="object-cover" />
              <button
                type="button"
                onClick={() => setPortfolio((list) => list.filter((x) => x !== p))}
                className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-card/90 text-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                aria-label={t("common.delete")}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("vp.portfolioUrl")}
            className={inputClass}
            aria-label={t("vp.portfolioAdd")}
          />
          <Button type="button" variant="outline" className="h-10 px-3" onClick={addPhoto} disabled={!url.trim()}>
            <Plus />
          </Button>
        </div>
      </Section>
      <div className="lg:col-span-2">
        <Button type="submit" className="h-11 px-6">
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
