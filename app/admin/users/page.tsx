"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Segmented, inputClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Monogram } from "@/components/vendor/badges";
import { setUserBlocked } from "@/lib/data/actions";
import { useDB } from "@/lib/data/store";
import type { Role } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useActor } from "@/lib/session";
import { cn } from "@/lib/utils";

export default function AdminUsers() {
  const { t, date } = useI18n();
  const actor = useActor();
  const db = useDB((d) => d);
  const [q, setQ] = useState("");
  const [role, setR] = useState<Role | "all">("all");
  const users = db.users
    .filter((u) => (role === "all" || u.role === role) && (!q || `${u.name} ${u.email ?? ""}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const stats = (id: string) => db.bookings.filter((b) => b.clientId === id).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("acab.users")} subtitle={t("acab.usersCount", { n: db.users.length })} />
      <Segmented
        value={role}
        onChange={setR}
        options={[
          { value: "all", label: t("common.all") },
          { value: "client", label: t("roles.client") },
          { value: "vendor", label: t("roles.vendor") },
          { value: "admin", label: t("roles.admin") },
        ]}
      />
      <label className="relative block max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.search")} className={cn(inputClass, "pl-9")} />
      </label>
      <ul className="divide-y divide-border rounded-2xl bg-card">
        {users.map((u) => (
          <li key={u.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", u.blocked && "bg-muted/40")}>
            <Monogram name={u.name || "?"} className="size-9 rounded-full text-sm" />
            <div className="min-w-0 flex-1">
              <div className={cn("truncate text-sm font-medium", u.blocked && "text-muted-foreground line-through")}>
                {u.name || u.email || u.id}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {t(`roles.${u.role}`)}
                {u.email && ` · ${u.email}`}
                {u.createdAt && ` · ${date(u.createdAt.slice(0, 10), "d MMM yyyy")}`}
                {u.role === "client" && ` · ${t("acab.bookingsCount", { n: stats(u.id) })}`}
              </div>
            </div>
            {u.role !== "admin" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    setUserBlocked(actor, u.id, !u.blocked);
                    toast(u.blocked ? t("acab.unblocked") : t("acab.blocked"));
                  }}
                >
                  {u.blocked ? t("acab.unblock") : t("acab.block")}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
