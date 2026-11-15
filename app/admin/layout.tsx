"use client";

import { BadgeCheck, Flag, Gavel, Images, LayoutDashboard, Receipt, Settings, Star, Store, Users, Wallet } from "lucide-react";
import { CabinetShell, RoleGate, type CabinetGroup } from "@/components/layout/cabinet-shell";
import { LogoMark } from "@/components/brand/logo";
import { useAdminCounters } from "@/lib/data/views/admin";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { routes } from "@/lib/routes";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const actor = useActor();
  const { disputes, waiting, complaints } = useAdminCounters();
  const groups: CabinetGroup[] = [
    { items: [{ href: routes.admin, label: "cabinet.overview", icon: LayoutDashboard, exact: true }] },
    {
      title: "acab.groupOps",
      items: [
        { href: routes.adminDisputes, label: "acab.disputes", icon: Gavel, badge: disputes },
        { href: routes.adminBookings, label: "cabinet.bookings", icon: Receipt },
        { href: routes.adminFinance, label: "vcab.finance", icon: Wallet },
      ],
    },
    {
      title: "acab.groupModeration",
      items: [
        { href: routes.adminVerification, label: "mod.verification", icon: BadgeCheck, badge: waiting },
        { href: routes.adminComplaints, label: "mod.complaints", icon: Flag, badge: complaints },
        { href: routes.adminVendors, label: "acab.vendors", icon: Store },
        { href: routes.adminUsers, label: "acab.users", icon: Users },
        { href: routes.adminPosts, label: "profile.tabPosts", icon: Images },
        { href: routes.adminReviews, label: "profile.tabReviews", icon: Star },
      ],
    },
    { items: [{ href: routes.adminSettings, label: "acab.settings", icon: Settings }] },
  ];
  return (
    <RoleGate ok={actor.role === "admin"}>
      <CabinetShell
        groups={groups}
        head={
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
              <LogoMark className="h-4 w-auto" />
            </span>
            <div>
              <div className="text-sm font-medium">EVENTUS</div>
              <div className="text-xs text-muted-foreground">{t("acab.console")}</div>
            </div>
          </div>
        }
      >
        {children}
      </CabinetShell>
    </RoleGate>
  );
}
