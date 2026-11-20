"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/store";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";

/** Hidden admin entrance: a password checked on the server (/api/admin/login), then the admin panel */
export default function AdminLogin() {
  const { t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setWrong(false);
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const { ok } = (await res.json()) as { ok?: boolean };
      if (!ok) {
        setWrong(true);
        return;
      }
      await useAuth.getState().signInAdminPanel();
      router.replace(routes.admin);
    } catch {
      setWrong(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <form onSubmit={(e) => void submit(e)} className="flex w-full max-w-sm flex-col items-center rounded-[28px] bg-card p-8 text-center">
        <Logo />
        <span className="mt-6 flex size-14 items-center justify-center rounded-full bg-cream">
          <LockKeyhole className="size-6 text-primary" strokeWidth={1.6} />
        </span>
        <h1 className="display mt-4 text-2xl">{t("adminLogin.title")}</h1>
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("adminLogin.password")}
          aria-label={t("adminLogin.password")}
          aria-invalid={wrong}
          className="mt-6 h-12 w-full rounded-full bg-foreground/[0.045] px-5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        {wrong && <p className="mt-2 text-sm text-destructive">{t("adminLogin.wrong")}</p>}
        <Button type="submit" variant="sun" className="mt-4 h-11 w-full" pending={busy}>
          {t("adminLogin.enter")}
        </Button>
      </form>
    </div>
  );
}
