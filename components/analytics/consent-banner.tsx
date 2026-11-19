"use client";

/**
 * Cookie banner and settings. Shown until the visitor decides (and again when the consent version grows);
 * «Cookie settings» in the footer reopens it. Necessary storage is always on; analytics is opt-in, so
 * «Only necessary» and closing the settings without a yes keep it off.
 */
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { hasDecided, useConsent } from "@/lib/analytics/consent";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

const noopSubscribe = () => () => {};

export function ConsentBanner() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const consent = useConsent((s) => s.consent);
  const settingsOpen = useConsent((s) => s.settingsOpen);
  if (!mounted || (hasDecided(consent) && !settingsOpen)) return null;
  // remount when opened from the footer, so the switch starts from the saved choice
  return <Panel key={settingsOpen ? "settings" : "banner"} startExpanded={settingsOpen} initial={consent?.analytics ?? false} />;
}

function Panel({ startExpanded, initial }: { startExpanded: boolean; initial: boolean }) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const decide = useConsent((s) => s.decide);
  const closeSettings = useConsent((s) => s.closeSettings);
  const decided = useConsent((s) => hasDecided(s.consent));
  const [expanded, setExpanded] = useState(startExpanded);
  const [analytics, setAnalytics] = useState(initial);

  return (
    <motion.div
      role="dialog"
      aria-label={t("legal.cookieTitle")}
      initial={{ opacity: 0, y: reduce ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-3 bottom-24 z-[70] rounded-3xl bg-card p-5 text-foreground shadow-[0_24px_60px_-20px_rgba(13,26,47,0.45)] lg:right-auto lg:bottom-5 lg:left-5 lg:w-[400px]"
    >
      <div className="text-md font-medium">{t("legal.cookieTitle")}</div>
      <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
        {t("legal.cookieText")}{" "}
        <Link href={`${routes.privacy}#cookies`} className="text-primary underline-offset-4 hover:underline">
          {t("legal.cookieMore")}
        </Link>
      </p>

      {expanded && (
        <div className="mt-4 flex flex-col gap-2">
          <Row title={t("legal.cookieNecessary")} text={t("legal.cookieNecessaryText")}>
            <span className="text-xs text-muted-foreground">{t("legal.cookieAlways")}</span>
          </Row>
          <Row title={t("legal.cookieAnalytics")} text={t("legal.cookieAnalyticsText")}>
            <Switch checked={analytics} onCheckedChange={setAnalytics} aria-label={t("legal.cookieAnalytics")} />
          </Row>
        </div>
      )}

      <div className={cn("mt-4 flex flex-wrap items-center gap-2")}>
        {expanded ? (
          <>
            <Button variant="sun" className="h-10 px-5" onClick={() => decide(analytics)}>
              {t("legal.cookieSave")}
            </Button>
            {decided && (
              <Button variant="ghost" className="h-10 px-4" onClick={closeSettings}>
                {t("common.cancel")}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="sun" className="h-10 px-5" onClick={() => decide(true)}>
              {t("legal.cookieAccept")}
            </Button>
            <Button variant="outline" className="h-10 px-4" onClick={() => decide(false)}>
              {t("legal.cookieDecline")}
            </Button>
            <button type="button" className="px-2 text-sm text-text-secondary underline-offset-4 hover:underline" onClick={() => setExpanded(true)}>
              {t("legal.cookieSettings")}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

function Row({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-foreground/[0.045] p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{text}</div>
      </div>
      {children}
    </div>
  );
}
