"use client";

import { ArrowLeft, Check, ImagePlus, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { CategoryIcon } from "@/components/category-icon";
import { Field, inputClass, textareaClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Monogram } from "@/components/vendor/badges";
import { signUpVendor } from "@/lib/data/actions";
import { can } from "@/lib/data/policies";
import { CITIES } from "@/lib/data/seed/catalog";
import { CATEGORY_PHOTOS, PHOTOS, unsplash } from "@/lib/data/seed/photos";
import { useDB } from "@/lib/data/store";
import { specFacts, specsProgress } from "@/lib/data/specs";
import type { CategoryId, VendorSpecs } from "@/lib/data/types";
import { SpecsForm } from "@/components/vendor-panel/specs-form";
import { defaultUnit, unitText, UnitPicker, type UnitValue } from "@/components/vendor-panel/unit-picker";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { useOnboardingDraft } from "@/lib/onboarding/draft";
import { useActor, useSession } from "@/lib/session";
import { readPhoto } from "@/lib/photos";
import { cn } from "@/lib/utils";

const STEPS = ["business", "details", "offer", "photos"] as const;
type Step = (typeof STEPS)[number];
const MAX_PHOTOS = 6;

/**
 * Vendor sign-up: a short form (business → first service → photos) with a live
 * preview of the post clients will see in the feed. No assistant chat here:
 * a vendor fills in their own showcase and lands in the vendor panel.
 */
export default function VendorSetupPage() {
  const { t, l, money } = useI18n();
  const router = useRouter();
  const actor = useActor();
  const user = useDB((db) => db.users.find((u) => u.id === actor.id));
  const categories = useDB((db) => [...db.categories].sort((a, b) => a.order - b.order));
  const hasVendor = useDB((db) => !can.registerOwnVendor(actor, db));
  const onboarded = user ? !user.needsOnboarding : false;
  // what the user already told the assistant on the first screen, if anything
  const prefill = useOnboardingDraft((s) => s.drafts[actor.id]?.answers);
  const clearDraft = useOnboardingDraft((s) => s.clear);

  const [step, setStep] = useState<Step>("business");
  const [bizName, setBizName] = useState(prefill?.bizName ?? "");
  const [category, setCategory] = useState<CategoryId | null>(prefill?.category ?? null);
  const [city, setCity] = useState(prefill?.city ?? "bishkek");
  const [phone, setPhone] = useState(prefill?.phone ?? user?.phone ?? "");
  const [tagline, setTagline] = useState(prefill?.tagline ?? "");
  const [offerTitle, setOfferTitle] = useState(prefill?.offerTitle ?? "");
  const [price, setPrice] = useState(prefill?.offerPrice ? String(prefill.offerPrice) : "");
  const [unit, setUnit] = useState<UnitValue | null>(null);
  const [uploads, setUploads] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [specs, setSpecs] = useState<VendorSpecs>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // an onboarded vendor has nothing to fill in here; an interrupted sign-up stays and finishes below
    if (hasVendor && onboarded && !busy) router.replace("/vendor");
  }, [hasVendor, onboarded, busy, router]);

  const stock = category ? PHOTOS[CATEGORY_PHOTOS[category]].slice(0, 9).map((id) => unsplash(id, 1080, 1350)) : [];
  const library = [...uploads, ...stock];
  // until the vendor touches the photos, the first three stock shots stand in
  const photos = picked ?? stock.slice(0, 3);

  const priceNum = Number(price.replace(/\s/g, ""));
  // what the price is for: the category's usual period until the vendor picks another
  const unitOf = unit ?? (category ? defaultUnit(category) : { per: "event" as const, qty: 1, text: "" });
  const valid: Record<Step, boolean> = {
    business: bizName.trim().length >= 2 && !!category && !!city,
    offer: tagline.trim().length >= 10 && offerTitle.trim().length >= 2 && priceNum > 0,
    photos: photos.length > 0,
    // details are optional, but the progress line nudges to fill them in
    details: true,
  };
  const idx = STEPS.indexOf(step);

  function togglePhoto(src: string) {
    const cur = picked ?? photos;
    if (cur.includes(src)) setPicked(cur.filter((x) => x !== src));
    else if (cur.length >= MAX_PHOTOS) toast(t("vsetup.photosMax", { n: MAX_PHOTOS }));
    else setPicked([...cur, src]);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    try {
      const read = await Promise.all([...files].slice(0, MAX_PHOTOS).map((f) => readPhoto(f)));
      setUploads((u) => [...read, ...u]);
      setPicked((p) => [...read, ...(p ?? photos)].slice(0, MAX_PHOTOS));
    } catch {
      toast.error(t("vsetup.photoError"));
    }
  }

  function next() {
    if (!valid[step]) return;
    if (idx < STEPS.length - 1) return setStep(STEPS[idx + 1]);
    finish();
  }

  function finish() {
    if (busy || !category) return;
    setBusy(true);
    try {
      // one atomic write; it also finishes an earlier interrupted attempt by reusing its vendor
      signUpVendor(actor, {
        ownerName: user?.name ?? bizName,
        name: bizName,
        category,
        city,
        phone: phone.trim() || undefined,
        tagline,
        specs,
        photos,
        offer: { title: offerTitle, price: priceNum, unit: unitText(unitOf) },
      });
      useSession.getState().setRole("vendor", actor.id);
      clearDraft(actor.id);
      toast.success(t("onboarding.doneVendor"));
      router.replace("/vendor");
    } catch (err) {
      console.error("[vendor-setup] finish failed", err);
      toast.error(t("common.error"));
      setBusy(false);
    }
  }

  const catName = category ? l(categories.find((c) => c.id === category)?.name) : t("vsetup.previewCategory");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => {
              if (idx > 0) return setStep(STEPS[idx - 1]);
              // forget the «vendor» answer, or the start screen would send us straight back here
              clearDraft(actor.id);
              router.push("/onboarding");
            }}
            aria-label={t("onboarding.back")}
            className="-ml-2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-[18px]" strokeWidth={1.5} />
          </button>
          <Logo className="mx-auto" />
          <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
            {idx + 1}/{STEPS.length}
          </span>
        </div>
        <div className="h-px bg-border">
          <div className="h-px bg-primary transition-[width] duration-500 ease-out" style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-8 md:py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="flex max-w-xl flex-col">
          <p className="text-sm text-muted-foreground">{t("vsetup.kicker")}</p>
          <h1 className="mt-2 font-heading tracking-[-0.025em] text-[32px] leading-tight md:text-5xl">{t(`vsetup.${step}.title` as MessageKey)}</h1>
          <p className="mt-3 text-md leading-relaxed text-text-secondary">{t(`vsetup.${step}.hint` as MessageKey)}</p>

          <ol className="mt-6 flex gap-4 text-sm" aria-label={t("vsetup.kicker")}>
            {STEPS.map((s, k) => (
              <li key={s}>
                <button
                  type="button"
                  disabled={k > idx && !STEPS.slice(0, k).every((x) => valid[x])}
                  onClick={() => setStep(s)}
                  className={cn(
                    "flex items-center gap-2 transition-colors disabled:cursor-default",
                    s === step ? "text-foreground" : "text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border text-[11px] tabular-nums",
                      k < idx ? "border-primary bg-primary text-primary-foreground" : s === step ? "border-foreground" : "border-border",
                    )}
                  >
                    {k < idx ? <Check className="size-3" strokeWidth={3} /> : k + 1}
                  </span>
                  <span className="max-sm:hidden">{t(`vsetup.${s}.short` as MessageKey)}</span>
                </button>
              </li>
            ))}
          </ol>

          <form
            className="mt-8 flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            {step === "business" && (
              <>
                <Field label={t("vsetup.bizName")}>
                  <input
                    autoFocus
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    maxLength={80}
                    placeholder={t("vsetup.bizNamePlaceholder")}
                    className={inputClass}
                  />
                </Field>
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-sm text-text-secondary">{t("vsetup.category")}</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={category === c.id}
                        onClick={() => {
                          if (c.id !== category) setSpecs({});
                          setCategory(c.id);
                          setUnit(null);
                          setPicked(null);
                        }}
                        className={cn(
                          "flex h-11 items-center gap-2.5 rounded-lg border px-3 text-left text-sm transition-colors",
                          category === c.id ? "border-primary bg-primary/5 text-foreground" : "border-border hover:border-foreground/30",
                        )}
                      >
                        <CategoryIcon id={c.id} className="size-4 shrink-0 text-primary" />
                        <span className="truncate">{l(c.name)}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-6">
                  <fieldset className="flex flex-col gap-1.5">
                    <legend className="mb-1.5 text-sm text-text-secondary">{t("vsetup.city")}</legend>
                    <div className="flex rounded-lg p-0.5 bg-foreground/[0.045]">
                      {Object.entries(CITIES).map(([id, name]) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={city === id}
                          onClick={() => setCity(id)}
                          className={cn(
                            "h-9 flex-1 rounded-md px-2 text-sm whitespace-nowrap transition-colors",
                            city === id ? "bg-secondary text-secondary-foreground" : "text-text-secondary hover:text-foreground",
                          )}
                        >
                          {l(name)}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <Field label={t("vsetup.phone")} hint={t("vsetup.phoneHint")}>
                    <input
                      value={phone ?? ""}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      maxLength={30}
                      placeholder="+996 700 000 000"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </>
            )}

            {step === "details" && category && (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${Math.round(specsProgress(category, specs) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t("vsetup.detailsFilled", { p: Math.round(specsProgress(category, specs) * 100) })}
                  </span>
                </div>
                <SpecsForm category={category} value={specs} onChange={setSpecs} />
              </>
            )}

            {step === "offer" && (
              <>
                <Field label={t("vsetup.tagline")} hint={t("vsetup.taglineHint", { n: 160 - tagline.length })}>
                  <textarea
                    autoFocus
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    rows={3}
                    maxLength={160}
                    placeholder={t("vsetup.taglinePlaceholder")}
                    className={textareaClass}
                  />
                </Field>
                <Field label={t("vsetup.offerTitle")}>
                  <input
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    maxLength={80}
                    placeholder={t("vsetup.offerTitlePlaceholder")}
                    className={inputClass}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <Field label={t("vp.price")}>
                    <span className="relative flex items-center">
                      <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value.replace(/[^\d\s]/g, ""))}
                        inputMode="numeric"
                        placeholder="25 000"
                        className={cn(inputClass, "pr-10 tabular-nums")}
                      />
                      <span className="pointer-events-none absolute right-3 text-xs text-muted-foreground">{t("specs.som")}</span>
                    </span>
                  </Field>
                  <Field label={t("vsetup.priceFor")} hint={t("vsetup.priceForHint")}>
                    {category && <UnitPicker category={category} value={unitOf} onChange={setUnit} />}
                  </Field>
                </div>
              </>
            )}

            {step === "photos" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-text-secondary">{t("vsetup.photosPicked", { n: photos.length, max: MAX_PHOTOS })}</span>
                  <span className="text-xs text-muted-foreground">{t("vsetup.photosCover")}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-text-secondary transition-colors hover:border-primary hover:text-primary"
                  >
                    <ImagePlus className="size-5" strokeWidth={1.5} />
                    {t("vsetup.upload")}
                  </button>
                  {library.map((src) => {
                    const n = photos.indexOf(src);
                    return (
                      <button
                        key={src}
                        type="button"
                        aria-pressed={n >= 0}
                        onClick={() => togglePhoto(src)}
                        className={cn(
                          "relative aspect-[4/5] overflow-hidden rounded-lg bg-muted outline-offset-2",
                          n >= 0 && "outline-2 outline-primary",
                        )}
                      >
                        <Image src={src} alt="" fill sizes="180px" className="object-cover" />
                        <span
                          className={cn(
                            "absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full border text-xs tabular-nums",
                            n >= 0 ? "border-primary bg-primary text-primary-foreground" : "border-white/80 bg-black/20",
                          )}
                        >
                          {n >= 0 ? n + 1 : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void onFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <p className="text-xs text-muted-foreground">{t("vsetup.photosHint")}</p>
              </div>
            )}

            <div className="flex items-center gap-3 border-t border-border pt-6">
              <Button type="submit" className="h-11 px-6" disabled={!valid[step] || busy}>
                {idx < STEPS.length - 1 ? t("vsetup.next") : t("vsetup.finish")}
              </Button>
              <span className="text-xs text-muted-foreground">{t(`vsetup.${step}.after` as MessageKey)}</span>
            </div>
          </form>
        </main>

        {/* live preview: the first post as clients will see it in the feed */}
        <aside className="max-lg:hidden">
          <div className="sticky top-24">
            <p className="mb-3 text-sm text-muted-foreground">{t("vsetup.preview")}</p>
            <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-neutral-900 text-white">
              {photos[0] ? (
                <Image src={photos[0]} alt="" fill sizes="340px" className="object-cover" />
              ) : (
                <span className="absolute inset-x-0 top-[38%] flex flex-col items-center gap-2 px-8 text-center text-xs text-white/50">
                  <ImagePlus className="size-6" strokeWidth={1.25} />
                  {t("vsetup.previewEmpty")}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-3.5">
                <div className="flex items-center gap-2">
                  <Monogram name={bizName || "E"} className="size-8 rounded-full text-[11px] ring-2 ring-white/80" />
                  <span className="truncate text-sm font-medium">{bizName || t("vsetup.previewName")}</span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-white/90">{tagline || t("vsetup.previewTagline")}</p>
                <p className="text-[11px] text-white/65">
                  {[catName, l(CITIES[city]), ...(category ? specFacts(category, specs, 2).map((f) => l(f)) : [])].join(" · ")}
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-white/12 p-1 pl-2.5 backdrop-blur-md">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] text-white/75">{offerTitle || t("vsetup.previewOffer")}</span>
                    <span className="block text-xs font-medium tabular-nums">
                      {t("feed.fromPrice", { amount: money(priceNum || 0) })} {l(unitText(unitOf)) && `/ ${l(unitText(unitOf))}`}
                    </span>
                  </span>
                  <MessageCircle className="size-4 shrink-0" strokeWidth={1.75} />
                  <span className="h-7 shrink-0 rounded-md bg-white px-2.5 text-xs leading-7 font-medium text-neutral-900">{t("feed.book")}</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("vsetup.previewHint")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

