"use client";

import { Check, ChevronDown, LogOut, RotateCcw, Shield, Store, Undo2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { demoConfig } from "@/config/demo";
import { useAuth } from "@/lib/auth/store";
import { useDataStore, useDB } from "@/lib/data/store";
import type { Role } from "@/lib/data/types";
import { LOCALES, useI18n } from "@/lib/i18n";
import { DEFAULT_USER_BY_ROLE, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { HOME_BY_ROLE } from "./nav-items";

const ROLE_ICONS: Record<Role, typeof User> = { client: User, vendor: Store, admin: Shield };

/** Avatar button → role switcher, language, reset demo */
export function SettingsMenu() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const { role, id, setRole } = useSession();
  const user = useDB((db) => db.users.find((u) => u.id === id));
  const resetDemo = useDataStore((s) => s.resetDemo);
  const accountId = useAuth((s) => s.userId);
  const isDemoAccount = useAuth((s) => s.demo);
  const signOut = useAuth((s) => s.signOut);
  const account = useDB((db) => db.users.find((u) => u.id === accountId));
  const actingAsOther = !!account && !isDemoAccount && account.id !== id;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const RoleIcon = ROLE_ICONS[role];
  const initials = (user?.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  function switchRole(next: Role) {
    setRole(next);
    router.push(HOME_BY_ROLE[next]);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={t("roles.switchTitle")}
              className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card pr-2 pl-1 text-sm transition-colors hover:bg-muted"
            />
          }
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-2xs font-medium text-secondary-foreground">
            {initials}
          </span>
          <span className="hidden items-center gap-2 text-text-secondary sm:flex">
            <RoleIcon className="size-4 text-muted-foreground" strokeWidth={1.5} />
            {t(`roles.${role}`)}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" strokeWidth={1.5} />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64 p-1.5">
          <div className="px-2 pt-1.5 pb-2">
            <div className="truncate text-sm font-medium">{user?.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {user?.email ?? (isDemoAccount ? t("common.demoMode") : t(`roles.${role}`))}
            </div>
          </div>
          {actingAsOther && (
            <DropdownMenuItem
              onClick={() => {
                setRole(account.role, account.id);
                router.push(HOME_BY_ROLE[account.role]);
              }}
              className="py-1.5"
            >
              <Undo2 className="text-muted-foreground" />
              {t("auth.backToAccount")}
            </DropdownMenuItem>
          )}
          {demoConfig.enabled && <DropdownMenuSeparator />}
          {demoConfig.enabled && (
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("auth.demoSwitch")}</DropdownMenuLabel>
              {(["client", "vendor", "admin"] as Role[]).map((r) => {
                const Icon = ROLE_ICONS[r];
                return (
                  <DropdownMenuItem key={r} onClick={() => switchRole(r)} className="py-1.5">
                    <Icon className="text-muted-foreground" />
                    {t(`roles.${r}`)}
                    {r === role && id === DEFAULT_USER_BY_ROLE[r] && <Check className="ml-auto text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("lang.label")}</DropdownMenuLabel>
            <div className="flex gap-1 px-1 pb-1">
              {LOCALES.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs transition-colors",
                    l === locale ? "bg-secondary font-medium text-secondary-foreground" : "hover:bg-muted",
                  )}
                >
                  {t(`lang.${l}`)}
                </button>
              ))}
            </div>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {demoConfig.enabled && (
            <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="py-1.5 text-muted-foreground">
              <RotateCcw />
              {t("demo.reset")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => {
              signOut();
              router.replace("/welcome");
            }}
            className="py-1.5"
          >
            <LogOut className="text-muted-foreground" />
            {t("auth.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("demo.reset")}</DialogTitle>
            <DialogDescription>{t("demo.resetConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                resetDemo();
                setConfirmOpen(false);
                toast.success(t("demo.resetDone"));
              }}
            >
              {t("demo.reset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
