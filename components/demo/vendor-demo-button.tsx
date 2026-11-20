"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { HOME_BY_ROLE } from "@/components/layout/nav-items";
import { demoConfig } from "@/config/demo";
import { useAuth } from "@/lib/auth/store";
import { demoVendorOwnerId } from "@/lib/data/seed";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * «Посмотреть кабинет исполнителя»: opens the demo as the seeded motorcade vendor — their cabinet,
 * profile, requests and money, the way a real vendor will see it. Hidden when the demo is off.
 */
export function VendorDemoButton({ className, label, icon = true }: { className?: string; label?: string; icon?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  if (!demoConfig.enabled) return null;
  return (
    <button
      type="button"
      onClick={() => {
        useAuth.getState().signInDemo(demoVendorOwnerId);
        router.replace(HOME_BY_ROLE.vendor);
      }}
      className={cn("w-fit text-sm underline-offset-4 transition-colors hover:underline", className)}
    >
      {icon && <Eye className="size-4" />}
      {label ?? t("demo.tryVendor")}
    </button>
  );
}
