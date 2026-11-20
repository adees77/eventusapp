"use client";

import { Check, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { HOME_BY_ROLE } from "@/components/layout/nav-items";
import { LinkButton } from "@/components/ui/link-button";
import { useAuth } from "@/lib/auth/store";
import { useI18n } from "@/lib/i18n";
import { useOwnVendor } from "@/lib/data/views/vendor";
import { useActor } from "@/lib/session";
import { routes, type VendorTab } from "@/lib/routes";

/** «Профиль» tab: a vendor sees their public page — the same one clients see — with owner controls */
export default function MePage() {
  return (
    <Suspense>
      <Me />
    </Suspense>
  );
}

function Me() {
  const guest = !useAuth((s) => s.userId);
  return guest ? <GuestProfile /> : <OwnProfile />;
}

/** A guest's «Profile» tab: what an account gives and the way to make one */
function GuestProfile() {
  const { t } = useI18n();
  return (
    <div className="container-app flex flex-1 items-center justify-center py-12">
      <div className="flex w-full max-w-md flex-col items-center rounded-[28px] bg-card p-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-cream">
          <UserRound className="size-7 text-primary" strokeWidth={1.6} />
        </span>
        <h1 className="display mt-5 text-2xl">{t("guest.profileTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t("guest.profileText")}</p>
        <ul className="mt-5 flex w-full flex-col gap-2 text-left text-sm">
          {[t("guest.perk1"), t("guest.perk2"), t("guest.perk3")].map((p) => (
            <li key={p} className="flex items-center gap-2.5 rounded-2xl bg-background px-3.5 py-2.5">
              <Check className="size-4 shrink-0 text-success" />
              {p}
            </li>
          ))}
        </ul>
        <LinkButton href={routes.welcome} variant="sun" className="mt-6 h-11 w-full">
          {t("guest.createProfile")}
        </LinkButton>
        <Link href={routes.welcome} className="mt-3 text-sm text-text-secondary hover:text-foreground">
          {t("guest.haveAccount")}
        </Link>
      </div>
    </div>
  );
}

function OwnProfile() {
  const router = useRouter();
  const params = useSearchParams();
  const actor = useActor();
  const slug = useOwnVendor()?.slug;
  useEffect(() => {
    // the vendor page ignores an unknown tab, so passing it through is safe
    const tab = (params.get("tab") ?? undefined) as VendorTab | undefined;
    router.replace(slug ? routes.vendor(slug, tab) : HOME_BY_ROLE[actor.role]);
  }, [slug, actor.role, params, router]);
  return null;
}
