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
          <span className="hidden cursor-default items-center gap-2 whitespace-nowrap text-xs text-muted-foreground sm:inline-flex" />
        }
      >
        <span className="size-1.5 rounded-full bg-gold" aria-hidden />
        {t("common.demoMode")}
      </TooltipTrigger>
      <TooltipContent>{t("common.demoModeHint")}</TooltipContent>
    </Tooltip>
  );
}
