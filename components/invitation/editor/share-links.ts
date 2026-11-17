/** Invitation sharing helpers: personal guest links and the message that goes with them */
import type { Invitation } from "@/lib/data/types";
import type { useI18n } from "@/lib/i18n";

export function guestLink(inv: Pick<Invitation, "id">, guestId?: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/i/${inv.id}${guestId ? `?g=${guestId}` : ""}`;
}

export function shareText(inv: Invitation, t: ReturnType<typeof useI18n>["t"], name?: string) {
  const body = inv.names ? t("inv.shareNames", { names: inv.names }) : t("inv.shareGeneric");
  return name ? `${name}, ${body.charAt(0).toLowerCase()}${body.slice(1)}` : body;
}
