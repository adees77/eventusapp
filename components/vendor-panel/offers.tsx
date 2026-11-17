"use client";

/** Vendor services: the list and the add / edit form */
import { Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Empty, Field, Section, inputClass, textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { deleteOffer, upsertOffer } from "@/lib/data/actions";
import { useVendorOffers } from "@/lib/data/views/vendor";
import type { Offer, Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { parseUnit, unitText, UnitPicker, type UnitValue } from "./unit-picker";
import { cn } from "@/lib/utils";
import { useAction } from "@/lib/data/use-action";

export function VendorOffers({ vendor }: { vendor: Vendor }) {
  const { t, l, money } = useI18n();
  const offers = useVendorOffers(vendor.id);
  const [editing, setEditing] = useState<Offer | "new" | null>(null);

  return (
    <Section
      title={t("vp.offers")}
      action={
        <Button className="h-9 px-4" onClick={() => setEditing("new")}>
          <Plus />
          {t("vp.addOffer")}
        </Button>
      }
    >
      {offers.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {offers.map((o) => (
            <li key={o.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                {o.photos[0] && <Image src={o.photos[0]} alt="" fill sizes="56px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn("truncate text-sm font-medium", !o.active && "text-muted-foreground")}>{l(o.title)}</div>
                <div className="text-sm text-text-secondary tabular-nums">
                  {money(o.price)} / {l(o.unit)} · {o.totalUnits}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(o)}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t("common.edit")}
              >
                <Pencil className="size-4" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{t("vp.noOffers")}</Empty>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("vp.addOffer") : t("vp.editOffer")}</DialogTitle>
          </DialogHeader>
          {editing !== null && (
            <OfferForm
              key={editing === "new" ? "new" : editing.id}
              vendor={vendor}
              initial={editing === "new" ? null : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Section>
  );
}

export function OfferForm({ vendor, initial, onDone }: { vendor: Vendor; initial: Offer | null; onDone: () => void }) {
  const { run } = useAction();
  const { t, locale } = useI18n();
  const [title, setTitle] = useState(initial?.title[locale] ?? "");
  const [description, setDescription] = useState(initial?.description[locale] ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [units, setUnits] = useState(String(initial?.totalUnits ?? 1));
  const [unit, setUnit] = useState<UnitValue>(() => parseUnit(initial?.unit, locale, vendor.category));
  const [photo, setPhoto] = useState(initial?.photos[0] ?? vendor.portfolio[0] ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const unitLabel = unitText(unit);
  const valid = title.trim() && Number(price) >= 0 && price !== "" && Number(units) >= 0 && unitLabel[locale];

  const loc = (value: string, prev?: { ru: string; en: string }) => {
    const v = value.trim();
    // the other language follows unless it was set separately before
    const other = locale === "ru" ? "en" : "ru";
    const keepOther = prev && prev[locale] === v ? prev[other] : v;
    return { [locale]: v, [other]: keepOther } as { ru: string; en: string };
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        void run(
          () =>
            upsertOffer({
          id: initial?.id,
          vendorId: vendor.id,
          title: loc(title, initial?.title),
          description: loc(description, initial?.description),
          // a period-based unit is already bilingual; free text follows the usual «other language» rule
          unit: unit.per === "custom" ? loc(unit.text, initial?.unit) : unitLabel,
          price: Number(price),
          totalUnits: Number(units),
          capacity: initial?.capacity,
          maxPerBooking: initial?.maxPerBooking,
          premium: initial?.premium,
          photos: photo ? [photo, ...(initial?.photos.filter((p) => p !== photo) ?? [])] : (initial?.photos ?? []),
          active,
            }),
          { success: t("common.saved"), onSuccess: onDone },
        );
      }}
    >
      <Field label={t("vp.offerTitle")}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} maxLength={100} required />
      </Field>
      <Field label={t("vp.description")}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={textareaClass} maxLength={400} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("vp.price")}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
            required
          />
        </Field>
        <Field label={t("vp.units")}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            className={inputClass}
            required
          />
        </Field>
      </div>
      <Field label={t("vsetup.priceFor")} hint={t("vsetup.priceForHint")}>
        <UnitPicker category={vendor.category} value={unit} onChange={setUnit} />
      </Field>
      {vendor.portfolio.length > 0 && (
        <div>
          <span className="text-sm text-text-secondary">{t("vp.photo")}</span>
          <div className="mt-1.5 grid grid-cols-5 gap-2">
            {vendor.portfolio.slice(0, 10).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPhoto(p)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg bg-muted",
                  photo === p ? "ring-2 ring-primary ring-offset-2" : "opacity-80 hover:opacity-100",
                )}
                aria-pressed={photo === p}
              >
                <Image src={p} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="flex items-center justify-between gap-3 text-sm">
        {t("vp.active")}
        <Switch checked={active} onCheckedChange={setActive} />
      </label>
      <DialogFooter className="sm:justify-between">
        {initial ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            onClick={() => run(() => deleteOffer(initial.id), { onSuccess: onDone })}
          >
            <Trash2 />
            {t("vp.deleteOffer")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!valid}>
            {t("common.save")}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
