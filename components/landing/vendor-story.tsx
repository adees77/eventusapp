"use client";

/**
 * The vendors' landing (/for-vendors): «become an EVENTUS vendor in one day» in seven scenes, from a working
 * cabinet and a verified profile to clients, the AI assistant and the money. Selling points: an event-only feed (no fighting memes and ads for
 * attention), warm requests with date and budget, an AI assistant that answers at night, prepayment
 * before the date closes, automatic payout, reviews only from real deals.
 */
import { ArrowRight, Check } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { track } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { VendorDemoButton } from "@/components/demo/vendor-demo-button";
import { InstallControls } from "./install-demo";
import { StoryStage, type SceneDef } from "./story-stage";
import { VendorFloats, VendorHud, VendorScreen, type VendorN } from "./vendor-story-screens";

const SCENES: SceneDef<VendorN>[] = [
  { n: 1, bg: "bg-ink", dark: true, side: 1, pose: { ry: -14, rz: 3, rx: 5 } },
  { n: 2, bg: "bg-cream", dark: false, side: -1, pose: { ry: 16, rz: -4, rx: 6 } },
  { n: 3, bg: "bg-primary", dark: true, side: 1, pose: { ry: -18, rz: -3, s: 1.03 } },
  { n: 4, bg: "bg-cream", dark: false, side: -1, pose: { ry: 12, rz: 4, rx: 6 } },
  { n: 5, bg: "bg-primary", dark: true, side: 1, pose: { ry: -12, rz: -3, rx: 8 } },
  { n: 6, bg: "bg-ink", dark: true, side: -1, pose: { ry: 6, rz: -2 } },
  { n: 7, bg: "bg-cream", dark: false, side: 1, pose: { ry: -8, rz: 2, rx: 4 } },
];

export function VendorStory() {
  const { t } = useI18n();

  const final = (dark: boolean) => (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-2 text-sm">
        {[t("landing.vB1"), t("landing.vB2"), t("landing.vB3")].map((b) => (
          <li key={b} className="flex items-center gap-2.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-sun text-sun-foreground">
              <Check className="size-3" />
            </span>
            {b}
          </li>
        ))}
      </ul>
      {ctas(dark, 6)}
    </div>
  );

  const ctas = (dark: boolean, scene: number) => (
      <div className="flex flex-wrap items-center gap-2">
        <LinkButton
          href={routes.welcomeVendor}
          variant="sun"
          className="h-11 px-5 text-md lg:h-12 lg:px-6"
          onClick={() => track("landing_cta_clicked", { page: "vendor", cta: "vendor_start", scene })}
        >
          {t("landing.vCta")}
          <ArrowRight />
        </LinkButton>
        <LinkButton
          href={routes.home}
          onClick={() => track("landing_cta_clicked", { page: "vendor", cta: "client_info", scene })}
          className={cn("hidden h-11 px-5 sm:inline-flex lg:h-12", dark ? "bg-white/10 text-white hover:bg-white/15" : "bg-foreground/[0.06] text-foreground hover:bg-foreground/10")}
        >
          {t("landing.vCtaClient")}
        </LinkButton>
      </div>
  );

  const hero = (dark: boolean) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <LinkButton
        href={routes.welcomeVendor}
        variant="sun"
        className="h-11 px-5 text-md lg:h-12 lg:px-6"
        onClick={() => track("landing_cta_clicked", { page: "vendor", cta: "vendor_start", scene: 1 })}
      >
        {t("landing.vCta")}
        <ArrowRight />
      </LinkButton>
      <VendorDemoButton
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full px-5 font-medium hover:no-underline lg:h-12",
          dark ? "bg-white/12 text-white hover:bg-white/20" : "bg-foreground/[0.06] text-foreground hover:bg-foreground/10",
        )}
      />
    </div>
  );

  return (
    <StoryStage
      page="vendor"
      label={t("landing.vLabel")}
      scenes={SCENES}
      startHref={routes.welcomeVendor}
      hud={(scene, dark) => <VendorHud scene={scene} dark={dark} />}
      screen={(n) => <VendorScreen n={n} />}
      floats={(n, side) => <VendorFloats n={n} side={side} />}
      copy={(n, dark) => ({
        kicker: t(`landing.v${n}k`),
        h1: n === 1,
        title: n === 1 ? <span style={{ fontWeight: 600 }}>{t("landing.v1t")}</span> : t(`landing.v${n}t`),
        text: t(`landing.v${n}p`),
        extra:
          n === 1 ? (
            hero(dark)
          ) : n === 6 ? (
            final(dark)
          ) : n === 7 ? (
            <InstallControls dark={dark} />
          ) : undefined,
        compact: n === 6 || n === 7,
      })}
    />
  );
}
