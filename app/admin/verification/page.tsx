"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Empty, PageHeader, Section, Segmented, inputClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { DocStatus } from "@/components/vendor-panel/documents";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { decideVerification, missingDocs, reviewDocument } from "@/lib/data/actions";
import { CITIES } from "@/lib/data/seed/catalog";
import { useDB } from "@/lib/data/store";
import type { Vendor, VendorDocument } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

type Tab = "pending" | "rejected" | "docs";

export default function AdminVerification() {
  const { t, l } = useI18n();
  const db = useDB((d) => d);
  const [tab, setTab] = useState<Tab>("pending");
  const byState = (s: "pending" | "rejected") =>
    db.vendors
      .filter((v) => v.verification?.state === s)
      .sort((a, b) => (a.verification!.requestedAt ?? "").localeCompare(b.verification!.requestedAt ?? ""));
  const pending = byState("pending");
  const rejected = byState("rejected");
  const shown = tab === "pending" ? pending : rejected;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("mod.verification")} subtitle={t("mod.verifHint")} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "pending", label: `${t("mod.queue")} · ${pending.length}` },
          { value: "rejected", label: `${t("mod.rejectedTab")} · ${rejected.length}` },
          { value: "docs", label: `${t("mod.docsTab")} · ${db.documents.length}` },
        ]}
      />

      {tab === "docs" ? (
        <DocsRegistry />
      ) : shown.length ? (
        <ul className="flex flex-col gap-3">
          {shown.map((v) => (
            <li key={v.id}>
              <VendorRequest vendor={v} catName={l(db.categories.find((c) => c.id === v.category)?.name)} city={l(CITIES[v.city])} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{t("mod.noQueue")}</Empty>
      )}
    </div>
  );
}

function VendorRequest({ vendor: v, catName, city }: { vendor: Vendor; catName: string; city: string }) {
  const { t, date } = useI18n();
  const actor = useActor();
  const docs = useDB((d) => d.documents.filter((x) => x.vendorId === v.id));
  const required = useDB((d) => d.settings.requiredDocs ?? []);
  const missing = useDB((d) => missingDocs(d, v.id));
  const [note, setNote] = useState("");
  const blockers = [...missing, ...docs.filter((x) => x.status === "rejected" && required.includes(x.kind)).map((x) => x.kind)];

  return (
    <Section
      title={
        <span className="flex items-center gap-3">
          <Monogram name={v.name} className="size-10 rounded-full text-sm" />
          <span className="min-w-0">
            <Link href={`/vendors/${v.slug}`} className="block truncate hover:underline">
              {v.name}
            </Link>
            <span className="block text-xs font-normal text-muted-foreground">
              {catName} · {city} · {t("mod.requested", { date: date(v.verification!.requestedAt.slice(0, 10), "d MMM") })}
            </span>
          </span>
        </span>
      }
    >
      <ul className="flex flex-col gap-2">
        {docs.map((d) => (
          <DocRow key={d.id} doc={d} required={required.includes(d.kind)} />
        ))}
      </ul>

      {v.verification?.note && (
        <p className="mt-3 rounded-2xl bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">{v.verification.note}</p>
      )}

      <p className={cn("mt-4 text-sm", blockers.length ? "text-destructive" : "text-success")}>
        {blockers.length ? t("mod.missing", { list: [...new Set(blockers)].map((k) => t(`mod.docKind.${k}`)).join(", ") }) : t("mod.allDocsOk")}
      </p>

      {v.verification?.state === "pending" && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("mod.rejectPlaceholder")}
            aria-label={t("mod.rejectReason")}
            className={cn(inputClass, "sm:flex-1")}
            maxLength={300}
          />
          <Button
            variant="outline"
            className="h-10 px-4"
            onClick={() => {
              decideVerification(actor, v.id, false, note);
              toast(t("mod.declinedToast"));
            }}
          >
            {t("mod.declineVendor")}
          </Button>
          <Button
            className="h-10 px-4"
            disabled={blockers.length > 0}
            onClick={() => {
              decideVerification(actor, v.id, true);
              toast.success(t("mod.approvedToast"));
            }}
          >
            <VerifiedSeal className="[&_svg]:size-4 [&_svg]:text-current" />
            {t("mod.approveVendor")}
          </Button>
        </div>
      )}
    </Section>
  );
}

function DocRow({ doc: d, required }: { doc: VendorDocument; required: boolean }) {
  const { t, date } = useI18n();
  const actor = useActor();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  return (
    <li className="rounded-2xl bg-foreground/[0.035] px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FileText className="size-5 shrink-0 text-primary" strokeWidth={1.5} />
        <div className="min-w-[10rem] flex-1">
          <div className="text-sm font-medium">
            {t(`mod.docKind.${d.kind}`)}
            {required && <span className="ml-1.5 text-xs font-normal text-muted-foreground">· {t("mod.required")}</span>}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {d.fileName} · {date(d.uploadedAt.slice(0, 10), "d MMM")}
          </div>
        </div>
        <DocStatus status={d.status} />
        {d.status === "pending" && !rejecting && (
          <span className="flex gap-1.5">
            <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setRejecting(true)}>
              {t("mod.rejectDoc")}
            </Button>
            <Button className="h-8 px-3 text-xs" onClick={() => reviewDocument(actor, d.id, "approved")}>
              {t("mod.approveDoc")}
            </Button>
          </span>
        )}
      </div>
      {d.note && <p className="mt-2 text-xs text-destructive">{d.note}</p>}
      {rejecting && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            reviewDocument(actor, d.id, "rejected", note);
            setRejecting(false);
          }}
        >
          <input
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("mod.rejectPlaceholder")}
            aria-label={t("mod.rejectReason")}
            className={cn(inputClass, "h-9 flex-1")}
            maxLength={300}
          />
          <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => setRejecting(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="destructive" className="h-9 px-3">
            {t("mod.rejectDoc")}
          </Button>
        </form>
      )}
    </li>
  );
}

function DocsRegistry() {
  const { t, date } = useI18n();
  const db = useDB((d) => d);
  const [f, setF] = useState<VendorDocument["status"] | "all">("pending");
  const docs = db.documents.filter((d) => f === "all" || d.status === f).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const count = (s: VendorDocument["status"]) => db.documents.filter((d) => d.status === s).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setF(s)}
            className={cn(
              "h-8 rounded-full px-3.5 text-sm transition-colors",
              f === s ? "bg-ink text-white" : "bg-foreground/[0.05] text-text-secondary hover:bg-foreground/[0.09]",
            )}
          >
            {s === "all" ? t("common.all") : `${t(`mod.docStatus.${s}`)} · ${count(s)}`}
          </button>
        ))}
      </div>
      {docs.length ? (
        <div className="overflow-hidden rounded-3xl bg-card">
          <ul className="divide-y divide-border">
            {docs.map((d) => {
              const v = db.vendors.find((x) => x.id === d.vendorId);
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 md:px-5">
                  <FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{t(`mod.docKind.${d.kind}`)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{d.fileName}</span>
                  </span>
                  <Link href={v ? `/vendors/${v.slug}` : "#"} className="w-40 truncate text-sm text-text-secondary hover:underline max-md:w-auto">
                    {v?.name ?? "—"}
                  </Link>
                  <span className="w-16 text-xs text-muted-foreground tabular-nums">{date(d.uploadedAt.slice(0, 10), "d MMM")}</span>
                  <DocStatus status={d.status} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <Empty>{t("mod.noQueue")}</Empty>
      )}
    </div>
  );
}
