"use client";

import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth/store";
import { useIsDemo } from "@/lib/demo/mode";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";

/** Header pill while the demo runs: what this is, and the way out to a real account */
export function DemoBadge() {
  const { t } = useI18n();
  const router = useRouter();
  const demo = useIsDemo();
  if (!demo) return null;
  return (
    <span className="hidden items-center gap-1 whitespace-nowrap text-xs sm:inline-flex">
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex cursor-default items-center gap-2 px-2 text-muted-foreground" />}>
          <span className="size-1.5 rounded-full bg-gold" aria-hidden />
          <span className="lg:hidden xl:inline">{t("common.demoMode")}</span>
        </TooltipTrigger>
        <TooltipContent>{t("common.demoModeHint")}</TooltipContent>
      </Tooltip>
      <button
        type="button"
        onClick={() => {
          useAuth.getState().signOut();
          router.replace(routes.welcome);
        }}
        className="h-7 rounded-full bg-sun px-3 font-medium text-sun-foreground transition-opacity hover:opacity-90"
      >
        {t("demo.signUp")}
      </button>
    </span>
  );
}
