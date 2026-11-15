"use client";

import { ExternalLink, LayoutDashboard, Receipt, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import { CabinetShell, RoleGate, type CabinetGroup } from "@/components/layout/cabinet-shell";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { useVendorToConfirm } from "@/lib/data/views/bookings";
import { useOwnVendor } from "@/lib/data/views/vendor";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { routes } from "@/lib/routes";

export default function VendorCabinetLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const actor = useActor();
  const vendor = useOwnVendor();
  const toConfirm = useVendorToConfirm(vendor?.id);

  const groups: CabinetGroup[] = [
    {
      items: [
        { href: routes.vendorHome, label: "cabinet.overview", icon: LayoutDashboard, exact: true },
        { href: routes.vendorBookings, label: "cabinet.bookings", icon: Receipt, badge: toConfirm },
      ],
    },
    // posts, services and details live in the «+» menu; reviews live on the profile; chats in the bottom bar;
    // the calendar is on the overview. The cabinet is the business side.
    {
      title: "vcab.groupBusiness",
      items: [
        { href: routes.vendorFinance, label: "vcab.finance", icon: Wallet },
        { href: routes.vendorProfile, label: "vcab.settings", icon: Settings },
      ],
    },
  ];

  return (
    <RoleGate ok={actor.role === "vendor" && !!vendor}>
      {vendor && (
        <CabinetShell
          groups={groups}
          head={
            <div className="flex items-center gap-3">
              <Monogram name={vendor.name} className="size-10 rounded-full text-sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="truncate text-sm font-medium">{vendor.name}</span>
                  {vendor.verified && <VerifiedSeal />}
                </div>
                <Link href={routes.vendor(vendor.slug)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  {t("vp.viewPublic")}
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </div>
          }
        >
          {vendor.hidden && (
            <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-sm text-text-secondary">{t("vp.hiddenNotice")}</p>
          )}
          {children}
        </CabinetShell>
      )}
    </RoleGate>
  );
}
