"use client";

/**
 * The client landing (/): nine scenes from the chaos of twenty chats to a booked, paid and invited toi.
 * The engine is story-stage.tsx; phone screens and floats are in story-screens.tsx.
 */
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { LinkButton } from "@/components/ui/link-button";
import { track } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { ClientFloats, ClientScreen, type ClientN } from "./story-screens";
import { InstallControls } from "./install-demo";
import { StoryStage, type SceneDef } from "./story-stage";

/** background, text mode, phone side and pose per scene — every scene stands the phone a little differently */
const SCENES: SceneDef<ClientN>[] = [
  { n: 1, bg: "bg-ink", dark: true, side: 1, pose: { ry: -16, rz: 4, rx: 6 } },
  { n: 2, bg: "bg-cream", dark: false, side: -1, pose: { ry: 18, rz: -6, rx: 4 } },
  { n: 3, bg: "bg-ink", dark: true, side: 1, pose: { ry: -10, rz: -3, rx: 2, y: -10 } },
  { n: 4, bg: "bg-cream", dark: false, side: -1, pose: { ry: 14, rz: 3, rx: 8 } },
  { n: 5, bg: "bg-primary", dark: true, side: 1, pose: { ry: -20, rz: -4, s: 1.03 } },
  { n: 6, bg: "bg-ink", dark: true, side: -1, pose: { ry: 10, rz: 5, rx: 3 } },
  { n: 7, bg: "bg-cream", dark: false, side: 1, pose: { ry: -12, rz: 2, rx: 10, y: 10 } },
  { n: 8, bg: "bg-primary", dark: true, side: -1, pose: { ry: 16, rz: -3 } },
  { n: 9, bg: "bg-ink", dark: true, side: 1, pose: { ry: -5, rz: 0 } },
];

export function Story() {
  const { t } = useI18n();

  const ctas = (n: ClientN, dark: boolean) => (
    <div className="flex flex-wrap items-center gap-2">
      <LinkButton
        href={routes.welcome}
        variant="sun"
        className="h-11 px-5 text-md lg:h-12 lg:px-6"
        onClick={() => track("landing_cta_clicked", { page: "client", cta: "client_start", scene: n })}
      >
        {t("landing.ctaClient")}
        <ArrowRight />
      </LinkButton>
      <LinkButton
        href={routes.forVendors}
        onClick={() => track("landing_cta_clicked", { page: "client", cta: "vendor_info", scene: n })}
        className={cn("hidden h-11 px-5 sm:inline-flex lg:h-12", dark ? "bg-white/10 text-white hover:bg-white/15" : "bg-foreground/[0.06] text-foreground hover:bg-foreground/10")}
      >
        {n === 1 ? t("landing.ctaVendor") : t("landing.storyVendorCta")}
      </LinkButton>
      {n === 1 && (
        <Link
          href={routes.feed}
          onClick={() => track("landing_cta_clicked", { page: "client", cta: "guest_feed", scene: n })}
          className={cn("ml-1 text-sm underline-offset-4 hover:underline", dark ? "text-white/70 hover:text-white" : "text-text-secondary")}
        >
          {t("landing.guestFeed")}
        </Link>
      )}
    </div>
  );

  return (
    <StoryStage
      page="client"
      label={t("landing.storyKicker")}
      scenes={SCENES}
      startHref={routes.welcome}
      screen={(n) => <ClientScreen n={n} />}
      floats={(n, side) => <ClientFloats n={n} side={side} />}
      copy={(n, dark) => ({
        kicker: t(`landing.story${n}k`),
        h1: n === 1,
        title:
          n === 1 ? (
            <span style={{ fontWeight: 600 }}>
              {t("landing.storyHeroA")} <span className="text-sun" style={{ fontWeight: 700 }}>{t("landing.storyHeroB")}</span>
            </span>
          ) : (
            t(`landing.story${n}t`)
          ),
        text: t(`landing.story${n}p`),
        extra:
          n === 9 ? (
            <div className="flex flex-col gap-6">
              <InstallControls dark={dark} />
              {ctas(n, dark)}
            </div>
          ) : n === 1 ? (
            ctas(n, dark)
          ) : undefined,
        compact: n === 1,
      })}
    />
  );
}
