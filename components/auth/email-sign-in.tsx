"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/store";
import { OTP_LENGTH, OTP_MAX_ATTEMPTS, isEmail, resendIn } from "@/lib/auth/otp";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { OtpInput } from "./otp-input";

/** Email → 6-digit code. Demo: the code is shown on screen instead of being emailed. */
export function EmailSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useI18n();
  const pending = useAuth((s) => s.pending);
  const requestEmailCode = useAuth((s) => s.requestEmailCode);
  const verifyEmailCode = useAuth((s) => s.verifyEmailCode);
  const cancelEmailCode = useAuth((s) => s.cancelEmailCode);

  const [email, setEmail] = useState(pending?.email ?? "");
  const [emailError, setEmailError] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // ticking clock for the resend timer
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pending]);

  function send(target: string) {
    const p = requestEmailCode(target);
    setCode("");
    setError(null);
    setNow(Date.now());
    toast(t("auth.demoCode", { code: p.code }), { duration: 8000 });
  }

  function verify(value: string) {
    const res = verifyEmailCode(value);
    if (res === "ok") return onSignedIn();
    const left = OTP_MAX_ATTEMPTS - (useAuth.getState().pending?.attempts ?? 0);
    setError(
      res === "wrong"
        ? t("auth.codeWrong", { n: left })
        : res === "expired"
          ? t("auth.codeExpired")
          : t("auth.codeLocked"),
    );
    setCode("");
  }

  if (!pending) {
    return (
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isEmail(email)) return setEmailError(true);
          send(email);
        }}
      >
        <label htmlFor="auth-email" className="sr-only">
          {t("auth.emailLabel")}
        </label>
        <input
          id="auth-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(false);
          }}
          placeholder={t("auth.emailPlaceholder")}
          aria-invalid={emailError}
          aria-describedby={emailError ? "auth-email-error" : undefined}
          className={cn(
            "h-12 w-full rounded-xl border bg-card px-4 text-md outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
            emailError ? "border-destructive/60" : "border-input",
          )}
        />
        {emailError && (
          <p id="auth-email-error" className="text-sm text-destructive">
            {t("auth.emailInvalid")}
          </p>
        )}
        <Button type="submit" className="h-12 w-full rounded-xl text-md">
          {t("auth.emailContinue")}
        </Button>
      </form>
    );
  }

  const wait = resendIn(pending, now);
  const locked = pending.attempts >= OTP_MAX_ATTEMPTS || now > pending.expiresAt;

  return (
    <div className="flex animate-rise flex-col gap-5">
      <button
        type="button"
        onClick={() => {
          cancelEmailCode();
          setError(null);
        }}
        className="-ml-1 flex w-fit items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" strokeWidth={1.5} />
        {t("auth.changeEmail")}
      </button>
      <div>
        <h2 className="font-heading tracking-[-0.025em] text-2xl leading-tight">{t("auth.codeTitle")}</h2>
        <p className="mt-1.5 text-sm text-text-secondary">{t("auth.codeSent", { email: pending.email })}</p>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === OTP_LENGTH) verify(code);
        }}
      >
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            setError(null);
            if (v.length === OTP_LENGTH && !locked) verify(v);
          }}
          invalid={!!error}
          autoFocus
          label={t("auth.codeTitle")}
        />
        <p className={cn("min-h-5 text-sm", error ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
          {error ?? t("auth.demoCode", { code: pending.code })}
        </p>
        <Button type="submit" className="h-12 w-full rounded-xl text-md" disabled={code.length < OTP_LENGTH || locked}>
          {t("auth.verify")}
        </Button>
      </form>
      <button
        type="button"
        disabled={wait > 0 && !locked}
        onClick={() => send(pending.email)}
        className="w-fit text-sm text-primary transition-colors hover:text-primary-hover disabled:text-muted-foreground"
      >
        {wait > 0 && !locked ? t("auth.resendIn", { s: wait }) : t("auth.resend")}
      </button>
    </div>
  );
}
