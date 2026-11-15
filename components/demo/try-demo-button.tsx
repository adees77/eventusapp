"use client";

import { useRouter } from "next/navigation";
import { demoConfig } from "@/config/demo";
import { useAuth } from "@/lib/auth/store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

/** «Посмотреть демо»: opens the seeded sandbox as the demo client. Hidden when the demo is off. */
export function TryDemoButton({ className, label }: { className?: string; label?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  if (!demoConfig.enabled) return null;
  return (
    <button
      type="button"
      onClick={() => {
        useAuth.getState().signInDemo();
        router.replace(routes.dashboard);
      }}
      className={cn("w-fit text-sm underline-offset-4 transition-colors hover:underline", className)}
    >
      {label ?? t("demo.try")}
    </button>
  );
}
