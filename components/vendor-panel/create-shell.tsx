"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { RoleGate } from "@/components/layout/cabinet-shell";
import { vendorOfOwner } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import type { Vendor } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";

/** Full-screen creator frame (new post, new service): a close button, a title, the vendor's own content */
export function CreateShell({ title, children }: { title: string; children: (vendor: Vendor) => React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const actor = useActor();
  const vendor = useDB((db) => vendorOfOwner(db, actor.id));
  return (
    <RoleGate ok={actor.role === "vendor" && !!vendor}>
      {vendor && (
        <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-28 md:pt-8 lg:pb-16">
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? router.back() : router.push("/me"))}
              aria-label={t("common.close")}
              className="-ml-2 flex size-9 items-center justify-center rounded-full text-text-secondary hover:bg-muted"
            >
              <X className="size-5" strokeWidth={1.5} />
            </button>
            <h1 className="font-serif text-3xl leading-tight md:text-4xl">{title}</h1>
          </div>
          {children(vendor)}
        </div>
      )}
    </RoleGate>
  );
}
