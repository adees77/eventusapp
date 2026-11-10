"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { EmailSignIn } from "@/components/auth/email-sign-in";
import { GoogleButton } from "@/components/auth/google-button";
import { HOME_BY_ROLE } from "@/components/layout/nav-items";
import { useAuth } from "@/lib/auth/store";
import { getDB } from "@/lib/data/store";
import { PHOTOS, unsplash } from "@/lib/data/seed/photos";
import { LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function WelcomePage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const signInWithGoogle = useAuth((s) => s.signInWithGoogle);
  const signInDemo = useAuth((s) => s.signInDemo);
  const pending = useAuth((s) => s.pending);

  function afterSignIn() {
    const id = useAuth.getState().userId;
    const user = getDB().users.find((u) => u.id === id);
    router.replace(!user || user.needsOnboarding ? "/onboarding" : HOME_BY_ROLE[user.role]);
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-4 pt-6 pb-8 sm:px-8 lg:px-16 lg:pt-10">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex gap-1">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                aria-pressed={l === locale}
                className={cn(
                  "h-8 rounded-md px-2.5 text-xs uppercase transition-colors",
                  l === locale ? "bg-secondary font-medium text-secondary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          {!pending && (
            <div className="animate-rise">
              <h1 className="font-serif text-4xl leading-[1.05] tracking-[-0.01em] [text-wrap:balance] md:text-5xl">
                {t("auth.title")}
              </h1>
              <p className="mt-4 text-md leading-relaxed text-text-secondary">{t("auth.subtitle")}</p>
            </div>
          )}

          <div className={cn("flex flex-col gap-5", !pending && "mt-10")}>
            {!pending && (
              <>
                <GoogleButton
                  onSignIn={(input) => {
                    signInWithGoogle(input);
                    afterSignIn();
                  }}
                />
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  {t("auth.or")}
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}
            <EmailSignIn onSignedIn={afterSignIn} />
          </div>

          {!pending && (
            <>
              <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{t("auth.terms")}</p>
              <button
                type="button"
                onClick={() => {
                  signInDemo();
                  router.replace("/");
                }}
                className="mt-10 w-fit border-b border-border pb-0.5 text-sm text-text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                {t("auth.demoLink")}
              </button>
            </>
          )}
        </main>
      </div>

      <div className="relative hidden p-3 lg:block">
        <div className="relative h-full overflow-hidden rounded-2xl">
          <Image
            src={unsplash(PHOTOS.halls[0], 1400, 1600)}
            alt=""
            fill
            priority
            sizes="55vw"
            className="object-cover"
          />
          <div className="absolute inset-4 rounded-xl border border-white/40" aria-hidden />
        </div>
      </div>
    </div>
  );
}
