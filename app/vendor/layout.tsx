"use client";

import { CalendarDays, ExternalLink, Images, LayoutDashboard, MessageCircle, Receipt, Settings, Star, Tag, Wallet } from "lucide-react";
import Link from "next/link";
import { CabinetShell, RoleGate, type CabinetGroup } from "@/components/layout/cabinet-shell";
import { Monogram, VerifiedSeal } from "@/components/vendor/badges";
import { unreadCount, vendorOfOwner } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { escrowOf } from "@/lib/payments/escrow";
import { useActor } from "@/lib/session";

export default function VendorCabinetLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const actor = useActor();
  const vendor = useDB((db) => vendorOfOwner(db, actor.id));
  const unread = useDB((db) => unreadCount(db, actor));
  const toConfirm = useDB(
    (db) => db.bookings.filter((b) => b.vendorId === vendor?.id && escrowOf(b).state === "held" && !b.escrow?.vendorConfirmedAt).length,
  );
  const unanswered = useDB((db) => db.reviews.filter((r) => r.vendorId === vendor?.id && r.bookingId && !r.reply).length);

  const groups: CabinetGroup[] = [
    {
      items: [
        { href: "/vendor", label: "cabinet.overview", icon: LayoutDashboard, exact: true },
        { href: "/vendor/bookings", label: "cabinet.bookings", icon: Receipt, badge: toConfirm },
        { href: "/messages", label: "nav.messages", icon: MessageCircle, badge: unread },
        { href: "/vendor/calendar", label: "vp.calendar", icon: CalendarDays },
      ],
    },
    {
      title: "vcab.groupShowcase",
      items: [
        { href: "/vendor/services", label: "vp.offers", icon: Tag },
        { href: "/vendor/posts", label: "profile.tabPosts", icon: Images },
        { href: "/vendor/reviews", label: "profile.tabReviews", icon: Star, badge: unanswered },
      ],
    },
    {
      title: "vcab.groupBusiness",
      items: [
        { href: "/vendor/finance", label: "vcab.finance", icon: Wallet },
        { href: "/vendor/profile", label: "vcab.settings", icon: Settings },
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
                <Link href={`/vendors/${vendor.slug}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  {t("vp.viewPublic")}
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </div>
          }
        >
          {vendor.hidden && (
            <p className="mb-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-text-secondary">{t("vp.hiddenNotice")}</p>
          )}
          {children}
        </CabinetShell>
      )}
    </RoleGate>
  );
}
