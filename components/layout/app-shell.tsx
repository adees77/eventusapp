"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { LogoMark } from "@/components/brand/logo";
import { useDataStore } from "@/lib/data/store";
import { useT } from "@/lib/i18n";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";

/**
 * Client-only shell: the mock DB lives in localStorage, so we render the app
 * after hydration and show a calm branded splash before that.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useDataStore((s) => s.hydrated);
  // false on the server and during hydration, true afterwards → no SSR mismatch
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const pathname = usePathname();

  if (!hydrated || !mounted) return <Splash />;

  // Public invitation page: guests see the card only, without app navigation
  if (pathname.startsWith("/i/")) return <main className="flex min-h-dvh flex-col">{children}</main>;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex flex-1 flex-col pb-20 lg:pb-0 print:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}

const noopSubscribe = () => () => {};

function Splash() {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center" aria-busy="true">
      <LogoMark className="h-8 w-auto opacity-80" />
      {/* CSS-only fallback: shows up only if the app hasn't started (old browser / JS blocked) */}
      <div className="splash-hint flex max-w-xs flex-col items-center gap-3 text-sm text-muted-foreground">
        <p>{t("common.splashHint")}</p>
        <a href="" className="rounded-full border border-border px-4 py-1.5 text-foreground">
          {t("common.reload")}
        </a>
      </div>
    </div>
  );
}
