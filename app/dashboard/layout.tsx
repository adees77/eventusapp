"use client";

import { Bookmark, CalendarHeart, CreditCard, LayoutDashboard, Receipt, UserRound } from "lucide-react";
import { CabinetShell, RoleGate, type CabinetGroup } from "@/components/layout/cabinet-shell";
import { Monogram } from "@/components/vendor/badges";
import { useClientTodoCount } from "@/lib/data/views/client";
import { useUser } from "@/lib/data/views/users";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { routes } from "@/lib/routes";

export default function ClientCabinetLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const actor = useActor();
  const name = useUser(actor.id)?.name ?? "";
  // deals waiting for this client's confirmation or payment
  const todo = useClientTodoCount(actor.id);

  const groups: CabinetGroup[] = [
    {
      items: [
        { href: routes.dashboard, label: "cabinet.overview", icon: LayoutDashboard, exact: true },
        { href: routes.events, label: "cabinet.events", icon: CalendarHeart },
        { href: routes.bookings, label: "cabinet.bookings", icon: Receipt, badge: todo },
        { href: routes.payments, label: "cabinet.payments", icon: CreditCard },
      ],
    },
    {
      title: "cabinet.groupMore",
      items: [
        { href: routes.saved, label: "cabinet.saved", icon: Bookmark },
        { href: routes.profile, label: "cabinet.profile", icon: UserRound },
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
