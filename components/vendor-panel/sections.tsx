"use client";

import { format } from "date-fns";
import { Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { AvailDots } from "@/components/avail-dots";
import { MonthCalendar } from "@/components/month-calendar";
import { Empty, Field, Section, inputClass, textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { deleteOffer, setBlockedUnits, updateVendor, upsertOffer } from "@/lib/data/actions";
import { getAvailability } from "@/lib/data/availability";
import { activeOffers } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import type { Offer, Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

/** Vendor self-service sections, used by the /vendor/* cabinet pages. */

// ── Offers ────────────────────────────────────────────────────

export function VendorOffers({ vendor }: { vendor: Vendor }) {
  const { t, l, money } = useI18n();
  const offers = useDB((db) => db.offers.filter((o) => o.vendorId === vendor.id));
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

function OfferForm({ vendor, initial, onDone }: { vendor: Vendor; initial: Offer | null; onDone: () => void }) {
  const { t, locale } = useI18n();
  const actor = useActor();
  const [title, setTitle] = useState(initial?.title[locale] ?? "");
  const [description, setDescription] = useState(initial?.description[locale] ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [units, setUnits] = useState(String(initial?.totalUnits ?? 1));
  const [unit, setUnit] = useState(initial?.unit[locale] ?? "");
  const [photo, setPhoto] = useState(initial?.photos[0] ?? vendor.portfolio[0] ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const valid = title.trim() && Number(price) >= 0 && price !== "" && Number(units) >= 0 && unit.trim();

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
        upsertOffer(actor, {
          id: initial?.id,
          vendorId: vendor.id,
          title: loc(title, initial?.title),
          description: loc(description, initial?.description),
          unit: loc(unit, initial?.unit),
          price: Number(price),
          totalUnits: Number(units),
          capacity: initial?.capacity,
          maxPerBooking: initial?.maxPerBooking,
          premium: initial?.premium,
          photos: photo ? [photo, ...(initial?.photos.filter((p) => p !== photo) ?? [])] : (initial?.photos ?? []),
          active,
        });
        toast.success(t("common.saved"));
        onDone();
      }}
    >
      <Field label={t("vp.offerTitle")}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} maxLength={100} required />
      </Field>
      <Field label={t("vp.description")}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={textareaClass} maxLength={400} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
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
        <Field label={t("vp.unit")}>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder={t("vp.unitPlaceholder")}
            className={inputClass}
            maxLength={40}
            required
          />
        </Field>
      </div>
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
            onClick={() => {
              deleteOffer(actor, initial.id);
              onDone();
            }}
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

// ── Calendar ──────────────────────────────────────────────────

export function VendorCalendar({ vendor }: { vendor: Vendor }) {
  const { t, l, date: fmt } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const offers = activeOffers(db, vendor.id);
  const [offerId, setOfferId] = useState(offers[0]?.id ?? "");
  const [day, setDay] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const offer = offers.find((o) => o.id === offerId) ?? offers[0];

  if (!offer) return <Empty>{t("vp.noOffers")}</Empty>;
  const a = getAvailability(db, offer, day);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Section
        title={t("vp.calendar")}
        action={
          <NativeSelect
            value={offer.id}
            onChange={(e) => setOfferId(e.target.value)}
            className="max-w-[60%]"
            aria-label={t("vp.selectOffer")}
          >
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {l(o.title)}
              </option>
            ))}
          </NativeSelect>
        }
      >
        <MonthCalendar
          value={day}
          onChange={setDay}
          renderDay={(d) => {
            if (!d.inMonth) return null;
            const av = getAvailability(db, offer, d.iso);
            return (
              <>
                <span>{format(d.date, "d")}</span>
                {!d.past && (
                  <span
                    className={cn(
                      "text-2xs leading-none tabular-nums",
                      d.selected ? "text-primary-foreground/80" : av.free ? "text-primary" : "text-muted-foreground/60",
                    )}
                  >
                    {av.free}/{av.total}
                  </span>
                )}
              </>
            );
          }}
        />
      </Section>
      <Section title={t("vp.blockTitle", { date: fmt(day, "d MMMM") })}>
        <div className="flex flex-col gap-4">
          <AvailDots a={a} />
          <div>
            <div className="text-sm text-text-secondary">{t("vp.blockHint")}</div>
            <div className="mt-2 flex h-11 w-fit items-center rounded-lg border border-input bg-card">
              <button
                type="button"
                className="flex size-11 items-center justify-center text-text-secondary disabled:opacity-30"
                disabled={a.blocked <= 0}
                onClick={() => setBlockedUnits(actor, offer.id, day, a.blocked - 1)}
                aria-label="−"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-12 text-center text-md font-medium tabular-nums">{a.blocked}</span>
              <button
                type="button"
                className="flex size-11 items-center justify-center text-text-secondary disabled:opacity-30"
                disabled={a.blocked + a.booked >= a.total}
                onClick={() => setBlockedUnits(actor, offer.id, day, a.blocked + 1)}
                aria-label="+"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          <dl className="flex flex-col gap-1 text-sm text-text-secondary tabular-nums">
            <div>{t("vp.bookedHere", { n: a.booked })}</div>
            <div>{t("vp.freeNow", { n: a.free, total: a.total })}</div>
          </dl>
        </div>
      </Section>
    </div>
  );
}

// ── Profile ───────────────────────────────────────────────────

export function VendorProfileForm({ vendor }: { vendor: Vendor }) {
  const { t, locale } = useI18n();
  const actor = useActor();
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
        updateVendor(actor, vendor.id, {
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
