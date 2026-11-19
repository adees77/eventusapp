"use client";

import { Button } from "@/components/ui/button";
import { LegalPage } from "@/components/legal/legal-page";
import { useConsent } from "@/lib/analytics/consent";
import { useI18n } from "@/lib/i18n";
import { PRIVACY } from "@/lib/legal/privacy";

/** Privacy policy; the cookies section opens the consent settings */
export default function PrivacyPage() {
  const { t } = useI18n();
  const openSettings = useConsent((s) => s.openSettings);
  return (
    <LegalPage
      doc={PRIVACY}
      extra={{
        cookies: (
          <Button variant="outline" className="h-10 w-fit px-5" onClick={openSettings}>
            {t("legal.footCookies")}
          </Button>
        ),
      }}
    />
  );
}
