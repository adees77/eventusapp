"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { homeAfterSignIn } from "@/components/auth/after-sign-in";
import { Logo } from "@/components/brand/logo";
import { useAuth } from "@/lib/auth/store";
import { currentLiveUser } from "@/lib/auth/supabase";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";

/**
 * Google sign-in comes back here (Supabase OAuth, PKCE). The Supabase client exchanges the `?code=`
 * by itself on load; this page waits for the session, turns it into the app account and moves on.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}

function Callback() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const asVendor = params.get("as") === "vendor";
  const providerError = params.get("error_description") ?? params.get("error");
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      if (providerError) throw new Error(providerError);
      const user = await currentLiveUser();
      if (!user) throw new Error("no session after OAuth redirect");
      await useAuth.getState().completeLiveSignIn(user);
      router.replace(homeAfterSignIn(user.id, asVendor));
    })().catch((e) => {
      console.error("[auth] callback", e);
      setFailed(true);
    });
  }, [providerError, asVendor, router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      {failed ? (
        <div className="flex max-w-sm flex-col items-center gap-4">
          <p className="text-md text-text-secondary">{t("auth.callbackFailed")}</p>
          <Link href={asVendor ? routes.welcomeVendor : routes.welcome} className="rounded-full bg-ink px-5 py-2.5 text-sm text-white">
            {t("common.back")}
          </Link>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-md text-text-secondary" role="status">
          <Loader2 className="size-4 animate-spin" />
          {t("auth.callbackTitle")}
        </p>
      )}
    </main>
  );
}
