"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { HOME_BY_ROLE } from "@/components/layout/nav-items";
import { vendorOfOwner } from "@/lib/data/queries";
import { useDB } from "@/lib/data/store";
import { useActor } from "@/lib/session";

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
  const slug = useDB((db) => vendorOfOwner(db, actor.id)?.slug);
  useEffect(() => {
    const tab = params.get("tab");
    router.replace(slug ? `/vendors/${slug}${tab ? `?tab=${tab}` : ""}` : HOME_BY_ROLE[actor.role]);
  }, [slug, actor.role, params, router]);
  return null;
}
