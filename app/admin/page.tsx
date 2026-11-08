"use client";

import { MoreHorizontal, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field, PageHeader, inputClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { createVendor, updateVendor } from "@/lib/data/actions";
import { PHOTOS, unsplash, type PhotoSet } from "@/lib/data/seed/photos";
import { CITIES } from "@/lib/data/seed/catalog";
import { useDB } from "@/lib/data/store";
import type { CategoryId, Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const COVER_BY_CATEGORY: Record<CategoryId, PhotoSet> = {
  cars: "cars_g",
  halls: "halls",
  furniture: "chairs",
  hosts: "hosts",
  photo: "photo",
  decor: "decor",
  music: "music",
  cakes: "cakes",
  beauty: "beauty",
  attire: "dresses",
  traditional: "traditional",
  shows: "fireworks",
};

export default function AdminPage() {
  const { t, tn, l } = useI18n();
  const actor = useActor();
  const setRole = useSession((s) => s.setRole);
  const router = useRouter();
  const db = useDB((d) => d);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);

  if (actor.role !== "admin") {
    return <div className="mx-auto flex flex-1 items-center justify-center px-4 py-24 text-sm text-text-secondary">{t("roles.switchHint")}</div>;
  }

  const vendors = db.vendors
    .filter((v) => !q || `${v.name} ${v.slug}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const catName = (id: CategoryId) => l(db.categories.find((c) => c.id === id)?.name);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 md:px-6 md:pt-12">
      <PageHeader
        title={t("admin.title")}
        subtitle={tn("admin.count", db.vendors.length)}
        action={
          <Button className="h-10 px-4" onClick={() => setEditing("new")}>
            <Plus />
            {t("admin.add")}
          </Button>
        }
      />

      <label className="relative mt-6 block max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.search")} className={cn(inputClass, "pl-9")} />
      </label>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-[1fr_160px_120px_72px_72px_120px_40px] gap-4 border-b border-border px-4 py-3 text-xs text-muted-foreground md:grid">
          <span>{t("admin.name")}</span>
          <span>{t("admin.category")}</span>
          <span>{t("admin.city")}</span>
          <span className="text-right">{t("admin.rating")}</span>
          <span className="text-right">{t("admin.offers")}</span>
          <span>{t("admin.status")}</span>
          <span />
        </div>
        <ul className="divide-y divide-border">
          {vendors.map((v) => {
            const offers = db.offers.filter((o) => o.vendorId === v.id && o.active).length;
            return (
              <li
                key={v.id}
                className={cn(
                  "grid grid-cols-[1fr_40px] items-center gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[1fr_160px_120px_72px_72px_120px_40px]",
                  v.hidden && "bg-muted/40",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Monogram name={v.name} className="size-9 rounded-lg text-sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/vendors/${v.slug}`} className={cn("truncate text-sm font-medium hover:underline", v.hidden && "text-muted-foreground")}>
                        {v.name}
                      </Link>
                      {v.verified && <VerifiedSeal />}
                    </div>
                    <div className="truncate text-xs text-muted-foreground md:hidden">
                      {catName(v.category)} · {l(CITIES[v.city])} · {v.hidden ? t("admin.hidden") : t("admin.visible")}
                    </div>
                  </div>
                </div>
                <span className="hidden truncate text-sm text-text-secondary md:block">{catName(v.category)}</span>
                <span className="hidden text-sm text-text-secondary md:block">{l(CITIES[v.city])}</span>
                <span className="hidden text-right text-sm tabular-nums md:block">{v.rating ? v.rating.toFixed(1) : "—"}</span>
                <span className="hidden text-right text-sm tabular-nums md:block">{offers}</span>
                <span className="hidden items-center gap-1.5 text-xs text-text-secondary md:flex">
                  <span className={cn("size-1.5 rounded-full", v.hidden ? "bg-muted-foreground" : "bg-success")} />
                  {v.hidden ? t("admin.hidden") : t("admin.visible")}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="row-span-1 flex size-9 items-center justify-center justify-self-end rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={t("admin.edit")}
                      />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setEditing(v)}>{t("admin.edit")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateVendor(actor, v.id, { hidden: !v.hidden })}>
                      {v.hidden ? t("admin.show") : t("admin.hide")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateVendor(actor, v.id, { verified: !v.verified })}>
                      {v.verified ? t("admin.unverify") : t("admin.verify")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setRole("vendor", v.ownerId);
                        router.push("/vendor");
                      }}
                    >
                      {t("admin.actAs")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("admin.add") : t("admin.edit")}</DialogTitle>
          </DialogHeader>
          {editing !== null && <VendorForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VendorForm({ initial, onDone }: { initial: Vendor | null; onDone: () => void }) {
  const { t, l, locale } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const [name, setName] = useState(initial?.name ?? "");
  const [owner, setOwner] = useState("");
  const [category, setCategory] = useState<CategoryId>(initial?.category ?? "cars");
  const [city, setCity] = useState(initial?.city ?? "bishkek");
  const [tagline, setTagline] = useState(initial?.tagline[locale] ?? "");
  const valid = name.trim().length > 1;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        const tl = { ru: tagline.trim(), en: tagline.trim() };
        if (initial) {
          updateVendor(actor, initial.id, { name: name.trim(), category, city, tagline: { ...initial.tagline, [locale]: tagline.trim() } });
          toast.success(t("common.saved"));
        } else {
          createVendor(actor, {
            name,
            owner,
            category,
            city,
            tagline: tl,
            cover: unsplash(PHOTOS[COVER_BY_CATEGORY[category]][0], 1600, 900),
          });
          toast.success(t("admin.created"));
        }
        onDone();
      }}
    >
      <Field label={t("admin.name")}>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={80} required />
      </Field>
      {!initial && (
        <Field label={t("admin.owner")}>
          <input value={owner} onChange={(e) => setOwner(e.target.value)} className={inputClass} maxLength={80} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin.category")}>
          <NativeSelect value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
            {db.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {l(c.name)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("admin.city")}>
          <NativeSelect value={city} onChange={(e) => setCity(e.target.value)}>
            {Object.entries(CITIES).map(([id, n]) => (
              <option key={id} value={id}>
                {l(n)}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label={t("vp.tagline")}>
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} maxLength={120} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={!valid}>
          {t("common.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
