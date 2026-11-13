"use client";

import { FileText, Upload, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Section } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { VerifiedSeal } from "@/components/vendor/badges";
import { DOC_KINDS, missingDocs, removeDocument, requestVerification, uploadDocument } from "@/lib/data/actions";
import { useDB } from "@/lib/data/store";
import type { DocKind, Vendor, VendorDocument } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export function DocStatus({ status }: { status: VendorDocument["status"] }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs",
        status === "approved" && "bg-success/10 text-success",
        status === "pending" && "bg-sun/35 text-sun-foreground",
        status === "rejected" && "bg-destructive/10 text-destructive",
      )}
    >
      {t(`mod.docStatus.${status}`)}
    </span>
  );
}

/** Vendor side of verification: upload papers per kind, then send the request */
export function VendorDocuments({ vendor }: { vendor: Vendor }) {
  const { t } = useI18n();
  const actor = useActor();
  const docs = useDB((d) => d.documents.filter((x) => x.vendorId === vendor.id));
  const settings = useDB((d) => d.settings);
  const missing = useDB((d) => missingDocs(d, vendor.id));
  const required = settings.requiredDocs ?? [];
  const state = vendor.verified ? "verified" : vendor.verification?.state;
  const kinds = [...required, ...DOC_KINDS.filter((k) => !required.includes(k))];
  const hasRejected = docs.some((d) => d.status === "rejected" && required.includes(d.kind));

  return (
    <Section
      title={t("mod.vDocs")}
      action={
        state === "verified" ? (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <VerifiedSeal /> {t("mod.vVerified")}
          </span>
        ) : state === "pending" ? (
          <DocStatus status="pending" />
        ) : state === "rejected" ? (
          <span className="text-sm text-destructive">{t("mod.vRejected")}</span>
        ) : undefined
      }
    >
      <p className="max-w-xl text-sm text-text-secondary">{t("mod.vDocsHint")}</p>
      {vendor.verification?.state === "rejected" && vendor.verification.note && (
        <p className="mt-3 rounded-2xl bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">{vendor.verification.note}</p>
      )}
      <ul className="mt-4 flex flex-col gap-2">
        {kinds.map((k) => (
          <DocSlot
            key={k}
            vendorId={vendor.id}
            kind={k}
            required={required.includes(k)}
            doc={docs.find((d) => d.kind === k)}
            locked={state === "verified" || state === "pending"}
          />
        ))}
      </ul>
      {!vendor.verified && vendor.verification?.state !== "pending" && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={missing.length > 0 || hasRejected}
            className="h-10 px-5"
            onClick={() => {
              requestVerification(actor, vendor.id);
              toast.success(t("mod.vSent"));
            }}
          >
            {t("mod.vSend")}
          </Button>
          {(missing.length > 0 || hasRejected) && <span className="text-sm text-muted-foreground">{t("mod.vNeed")}</span>}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        {t("mod.vHelp", { phone: settings.supportPhone ?? "", email: settings.supportEmail ?? "" })}
      </p>
    </Section>
  );
}

function DocSlot({
  vendorId,
  kind,
  required,
  doc,
  locked,
}: {
  vendorId: string;
  kind: DocKind;
  required: boolean;
  doc?: VendorDocument;
  locked: boolean;
}) {
  const { t } = useI18n();
  const actor = useActor();
  const input = useRef<HTMLInputElement>(null);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-foreground/[0.035] px-4 py-3">
      <FileText className={cn("size-5 shrink-0", doc ? "text-primary" : "text-muted-foreground")} strokeWidth={1.5} />
      <div className="min-w-[10rem] flex-1">
        <div className="text-sm font-medium">
          {t(`mod.docKind.${kind}`)}
          {required && <span className="ml-1.5 text-xs font-normal text-muted-foreground">· {t("mod.required")}</span>}
        </div>
        {doc && <div className="truncate text-xs text-muted-foreground">{doc.fileName}</div>}
        {doc?.note && <div className="mt-0.5 text-xs text-destructive">{doc.note}</div>}
      </div>
      {doc && <DocStatus status={doc.status} />}
      {!locked && doc?.status !== "approved" && (
        <span className="flex gap-1.5">
          {doc && (
            <button
              type="button"
              onClick={() => removeDocument(actor, doc.id)}
              aria-label={t("mod.vRemove")}
              title={t("mod.vRemove")}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
          <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => input.current?.click()}>
            <Upload className="size-3.5" />
            {doc ? t("mod.vReplace") : t("mod.vUpload")}
          </Button>
          <input
            ref={input}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadDocument(actor, vendorId, kind, f.name);
              e.target.value = "";
            }}
          />
        </span>
      )}
    </li>
  );
}
