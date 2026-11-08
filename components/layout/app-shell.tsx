"use client";

import { useSyncExternalStore } from "react";
import { LogoMark } from "@/components/brand/logo";
import { useDataStore } from "@/lib/data/store";
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

  if (!hydrated || !mounted) return <Splash />;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex flex-1 flex-col pb-20 lg:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}

const noopSubscribe = () => () => {};

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
      <LogoMark className="h-8 w-auto opacity-80" />
    </div>
  );
}
