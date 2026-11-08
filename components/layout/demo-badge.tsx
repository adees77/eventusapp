"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { demoConfig } from "@/config/demo";
import { useI18n } from "@/lib/i18n";

export function DemoBadge() {
  const { t } = useI18n();
  if (!demoConfig.enabled) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="hidden cursor-default items-center whitespace-nowrap gap-1.5 rounded-full border border-gold/40 bg-gold-soft px-3 py-1 text-xs text-gold-foreground sm:inline-flex" />
        }
      >
        <span className="size-1.5 rounded-full bg-gold" />
        {t("common.demoMode")}
      </TooltipTrigger>
      <TooltipContent>{t("common.demoModeHint")}</TooltipContent>
    </Tooltip>
  );
}
