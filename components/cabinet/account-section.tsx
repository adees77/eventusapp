"use client";

import { Check, LogOut, RotateCcw, Shield, Store, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field, Section, inputClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HOME_BY_ROLE } from "@/components/layout/nav-items";
import { demoConfig } from "@/config/demo";
import { useAuth } from "@/lib/auth/store";
import { useDataStore } from "@/lib/data/store";
import { useUser } from "@/lib/data/views/users";
import type { Role } from "@/lib/data/types";
import { useIsDemo } from "@/lib/demo/mode";
import { LOCALES, useI18n } from "@/lib/i18n";
import { DEFAULT_USER_BY_ROLE, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

const ROLE_ICONS: Record<Role, typeof User> = { client: User, vendor: Store, admin: Shield };

/**
 * Everything about the account itself, in the profile (the header has no account
 * menu): email and its change, language, the demo role switcher and reset, sign-out.
 */
export function AccountSection() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const { role, id, setRole } = useSession();
  const user = useUser(id);
  const isDemo = useIsDemo();
  const canSwitch = isDemo && demoConfig.features.roleSwitcher;
  const signOut = useAuth((s) => s.signOut);
  const changeEmail = useAuth((s) => s.changeEmail);
  const resetDemo = useDataStore((s) => s.resetDemo);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  async function submitEmail() {
    const next = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) return toast.error(t("account.emailInvalid"));
    if (next === user?.email?.toLowerCase()) return setEditing(false);
    setSending(true);
    try {
      const res = await changeEmail(next);
      setEditing(false);
      if (res === "sent") setSentTo(next);
      else toast.success(t("common.saved"));
    } catch (err) {
      console.error(err);
      toast.error(t("account.emailFailed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <Section title={t("account.title")}>
      <div className="flex flex-col gap-6">
        {!isDemo && (
          <div className="flex flex-col gap-2">
            {editing ? (
              <form
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitEmail();
                }}
              >
                <div className="flex-1">
                <Field label={t("account.newEmail")}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    autoComplete="email"
                    autoFocus
                    maxLength={120}
                  />
                </Field>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="h-10 px-5" pending={sending}>
                    {t("common.save")}
                  </Button>
                  <Button type="button" variant="outline" className="h-10 px-4" onClick={() => setEditing(false)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{t("cabinet.email")}</div>
                  <div className="truncate text-md">{user?.email ?? "—"}</div>
                </div>
                <Button
                  variant="outline"
                  className="h-9 shrink-0 px-4"
                  onClick={() => {
                    setEmail(user?.email ?? "");
                    setEditing(true);
                  }}
                >
                  {t("account.changeEmail")}
                </Button>
              </div>
            )}
            {sentTo && <p className="text-sm text-text-secondary">{t("account.emailSent", { email: sentTo })}</p>}
          </div>
        )}

        <div>
          <div className="text-xs text-muted-foreground">{t("lang.label")}</div>
          <div className="mt-2 flex gap-1.5">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                aria-pressed={l === locale}
                className={cn(
                  "h-9 rounded-full px-4 text-sm transition-colors",
                  l === locale ? "bg-ink text-white" : "bg-foreground/[0.05] text-text-secondary hover:bg-foreground/[0.09]",
                )}
              >
                {t(`lang.${l}`)}
              </button>
            ))}
          </div>
        </div>

        {canSwitch && (
          <div>
            <div className="text-xs text-muted-foreground">{t("auth.demoSwitch")}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["client", "vendor", "admin"] as Role[]).map((r) => {
                const Icon = ROLE_ICONS[r];
                const on = r === role && id === DEFAULT_USER_BY_ROLE[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      router.push(HOME_BY_ROLE[r]);
                    }}
                    aria-pressed={on}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-full px-4 text-sm transition-colors",
                      on ? "bg-ink text-white" : "bg-foreground/[0.05] text-text-secondary hover:bg-foreground/[0.09]",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.6} />
                    {t(`roles.${r}`)}
                    {on && <Check className="size-3.5 text-sun" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {isDemo && demoConfig.features.reset && (
            <Button variant="outline" className="h-10 px-4" onClick={() => setConfirmReset(true)}>
              <RotateCcw />
              {t("demo.reset")}
            </Button>
          )}
          <Button
            variant="outline"
            className="h-10 px-4"
            onClick={() => {
              signOut();
              router.replace(isDemo ? routes.home : routes.welcome);
            }}
          >
            <LogOut />
            {isDemo ? t("demo.leave") : t("auth.signOut")}
          </Button>
        </div>
      </div>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("demo.reset")}</DialogTitle>
            <DialogDescription>{t("demo.resetConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                resetDemo();
                setConfirmReset(false);
                toast.success(t("demo.resetDone"));
              }}
            >
              {t("demo.reset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
