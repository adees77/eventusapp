"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isEmail, nameFromEmail } from "@/lib/auth/otp";
import { useI18n } from "@/lib/i18n";

/** Standard "Continue with Google" button. In the demo it opens a small form instead of the OAuth popup. */
export function GoogleButton({ onSignIn }: { onSignIn: (input: { name: string; email: string }) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = isEmail(email) && name.trim().length >= 2;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-card text-md text-foreground transition-colors hover:bg-muted active:translate-y-px"
      >
        <GoogleMark className="size-[18px]" />
        {t("auth.google")}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <GoogleMark className="size-4" />
              {t("auth.googleTitle")}
            </DialogTitle>
            <DialogDescription>{t("auth.googleDemo")}</DialogDescription>
          </DialogHeader>
          <form
            id="google-form"
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (!valid) return;
              setOpen(false);
              onSignIn({ name: name.trim(), email: email.trim() });
            }}
          >
            <Field label={t("auth.googleEmail")}>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => !name && isEmail(email) && setName(nameFromEmail(email))}
                placeholder="name@gmail.com"
                aria-invalid={touched && !isEmail(email)}
                className={inputClass}
              />
            </Field>
            <Field label={t("auth.googleName")}>
              <input
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={touched && name.trim().length < 2}
                className={inputClass}
              />
            </Field>
          </form>
          <DialogFooter>
            <Button type="submit" form="google-form" className="h-10 w-full" disabled={touched && !valid}>
              {t("auth.googleContinue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.77.9 7.35 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
