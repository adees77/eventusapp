"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { HOME_BY_ROLE } from "@/components/layout/nav-items";
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
