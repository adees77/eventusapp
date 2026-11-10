"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { LogoMark } from "@/components/brand/logo";
import { InvitationPage } from "@/components/invitation/page/invitation-page";
import { recordInvitationView } from "@/lib/data/actions";
import { useDB } from "@/lib/data/store";
import { useI18n } from "@/lib/i18n";

/** Public guest page: the invitation as a standalone web page. No app navigation. */
export default function GuestInvitationPage() {
  return (
    <Suspense>
      <Guest />
    </Suspense>
  );
}

function Guest() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { t } = useI18n();
  const inv = useDB((db) => db.invitations.find((i) => i.id === id));
  const guestId = params.get("g") ?? undefined;
  const guest = inv?.guests.find((g) => g.id === guestId);
  const found = !!inv;

  // one view per tab session; personal links also mark the guest as "opened"
  useEffect(() => {
    if (!found) return;
    const key = `eventus-view-${id}-${guestId ?? ""}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: still count */
    }
    recordInvitationView(id, guestId);
  }, [found, id, guestId]);

  useEffect(() => {
    if (!found || params.get("print") !== "1") return;
    const timer = setTimeout(() => window.print(), 800);
    return () => clearTimeout(timer);
  }, [found, params]);

  if (!inv) {
    return (
      <div className="m-auto flex max-w-sm flex-col items-center gap-3 px-4 py-24 text-center">
        <LogoMark className="h-6 w-auto opacity-70" />
        <p className="mt-4 font-serif text-2xl">{t("invitations.notFound")}</p>
        <p className="text-sm text-text-secondary">{t("invitations.notFoundHint")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col" style={{ background: inv.design.theme.bg }}>
      <main className="mx-auto w-full max-w-[720px] animate-rise">
        <InvitationPage data={inv} mode="live" guest={guest ? { id: guest.id, name: guest.name.split(" ")[0] } : null} />
      </main>
      <footer
        className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-2 px-6 pt-6 pb-10 print:hidden"
        style={{ color: inv.design.theme.muted }}
      >
        <Link href="/" className="opacity-60 transition-opacity hover:opacity-100" aria-label="EVENTUS">
          <LogoMark className="h-4 w-auto" />
        </Link>
        <span className="text-2xs">{t("inv.madeWith")}</span>
      </footer>
    </div>
  );
}
