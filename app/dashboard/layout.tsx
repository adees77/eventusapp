"use client";

import { Bookmark, CalendarHeart, CreditCard, LayoutDashboard, Mail, MessageCircle, Receipt, UserRound } from "lucide-react";
import { CabinetShell, RoleGate, type CabinetGroup } from "@/components/layout/cabinet-shell";
import { Monogram } from "@/components/vendor/badges";
import { unreadCount } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";
import { escrowOf } from "@/lib/payments/escrow";
import { useActor } from "@/lib/session";

export default function ClientCabinetLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const actor = useActor();
  const name = useDB((db) => db.users.find((u) => u.id === actor.id)?.name ?? "");
  const unread = useDB((db) => unreadCount(db, actor));
  // deals waiting for this client's confirmation or payment
  const todo = useDB(
    (db) =>
      db.bookings.filter(
        (b) => b.clientId === actor.id && (b.status === "pending" || (escrowOf(b).state === "held" && !b.escrow?.clientConfirmedAt)),
      ).length,
  );

  const groups: CabinetGroup[] = [
    {
      items: [
        { href: "/dashboard", label: "cabinet.overview", icon: LayoutDashboard, exact: true },
        { href: "/dashboard/events", label: "cabinet.events", icon: CalendarHeart },
        { href: "/dashboard/bookings", label: "cabinet.bookings", icon: Receipt, badge: todo },
        { href: "/dashboard/payments", label: "cabinet.payments", icon: CreditCard },
      ],
    },
    {
      title: "cabinet.groupMore",
      items: [
        { href: "/dashboard/saved", label: "cabinet.saved", icon: Bookmark },
        { href: "/messages", label: "nav.messages", icon: MessageCircle, badge: unread },
        { href: "/invitations", label: "nav.invitations", icon: Mail },
        { href: "/dashboard/profile", label: "cabinet.profile", icon: UserRound },
      ],
    },
  ];

  return (
    <RoleGate ok={actor.role === "client"}>
      <CabinetShell
        groups={groups}
        head={
          <div className="flex items-center gap-3">
            <Monogram name={name || "?"} className="size-10 rounded-full text-sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{name || t("roles.client")}</div>
              <div className="text-xs text-muted-foreground">{t("roles.client")}</div>
            </div>
          </div>
        }
      >
        {children}
      </CabinetShell>
    </RoleGate>
  );
}
