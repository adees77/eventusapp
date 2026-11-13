"use client";

import { BadgeCheck, Flag, Gavel, Images, LayoutDashboard, Receipt, Settings, Star, Store, Users, Wallet } from "lucide-react";
import { CabinetShell, RoleGate, type CabinetGroup } from "@/components/layout/cabinet-shell";
import { LogoMark } from "@/components/brand/logo";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const actor = useActor();
  const disputes = useDB((db) => db.bookings.filter((b) => b.escrow?.state === "disputed").length);
  const waiting = useDB((db) => db.vendors.filter((v) => v.verification?.state === "pending").length);
  const complaints = useDB((db) => new Set(db.complaints.filter((c) => c.status === "open").map((c) => c.targetId)).size);
  const groups: CabinetGroup[] = [
    { items: [{ href: "/admin", label: "cabinet.overview", icon: LayoutDashboard, exact: true }] },
    {
      title: "acab.groupOps",
      items: [
        { href: "/admin/disputes", label: "acab.disputes", icon: Gavel, badge: disputes },
        { href: "/admin/bookings", label: "cabinet.bookings", icon: Receipt },
        { href: "/admin/finance", label: "vcab.finance", icon: Wallet },
      ],
    },
    {
      title: "acab.groupModeration",
      items: [
        { href: "/admin/verification", label: "mod.verification", icon: BadgeCheck, badge: waiting },
        { href: "/admin/complaints", label: "mod.complaints", icon: Flag, badge: complaints },
        { href: "/admin/vendors", label: "acab.vendors", icon: Store },
        { href: "/admin/users", label: "acab.users", icon: Users },
        { href: "/admin/posts", label: "profile.tabPosts", icon: Images },
        { href: "/admin/reviews", label: "profile.tabReviews", icon: Star },
      ],
    },
    { items: [{ href: "/admin/settings", label: "acab.settings", icon: Settings }] },
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
