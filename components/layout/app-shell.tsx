"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { LogoMark } from "@/components/brand/logo";
import { ensureSessionBound, useAuth } from "@/lib/auth/store";
import { useDataStore } from "@/lib/data/store";
import { useT } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";
import { HOME_BY_ROLE } from "./nav-items";

/** Pages that render without the app chrome */
const BARE = ["/welcome", "/onboarding"];
/** Pages open without an account (guest invitation links) */
const PUBLIC = ["/welcome", "/i/"];

const matches = (pathname: string, list: string[]) =>
  list.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));

/**
 * Client-only shell: the mock DB lives in localStorage, so we render the app
 * after hydration and show a calm branded splash before that. It also routes
 * by auth state: no account → landing (/) or /welcome, account not onboarded →
 * /onboarding, signed-in user on the landing → their home.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useDataStore((s) => s.hydrated);
  // false on the server and during hydration, true afterwards → no SSR mismatch
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const pathname = usePathname();
  const router = useRouter();
  const userId = useAuth((s) => s.userId);
  const role = useSession((s) => s.role);
  const bound = useSession((s) => s.bound);
  const user = useDataStore((s) => s.db?.users.find((u) => u.id === userId));

  // a new tab has an empty sessionStorage: wait until it is attached to the account
  const ready = hydrated && mounted && (!userId || bound);
  const isLanding = pathname === "/";
  const isPublic = isLanding || matches(pathname, PUBLIC);
  const needsOnboarding = !!userId && !!user?.needsOnboarding;
  const target = !ready
    ? null
    : !userId
      ? isPublic
        ? null
        : "/welcome"
      : needsOnboarding
        ? matches(pathname, ["/onboarding"])
          ? null
          : "/onboarding"
        : isLanding || pathname === "/welcome" || matches(pathname, ["/onboarding"])
          ? HOME_BY_ROLE[role]
          : null;

  useEffect(() => {
    if (hydrated && mounted) ensureSessionBound();
  }, [hydrated, mounted, userId]);

  // the account disappeared (demo reset wipes sign-ups) → back to /welcome
  const orphan = hydrated && !!userId && !user;
  useEffect(() => {
    if (orphan) useAuth.getState().signOut();
  }, [orphan]);

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (!ready || target) return <Splash />;
  if (isLanding || matches(pathname, BARE) || pathname.startsWith("/i/")) return <>{children}</>;

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
