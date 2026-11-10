import type { MessageKey } from "@/lib/i18n";
import type { Answers } from "@/lib/onboarding/script";

type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function eventTitle(a: Answers, t: T): string {
  if (a.eventTitle) return a.eventTitle;
  if (!a.eventType || a.eventType === "other") return t("onboarding.summary.event");
  return t(`onboarding.options.eventType.${a.eventType}`);
}
