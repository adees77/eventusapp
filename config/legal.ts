/**
 * Who runs the service — shown in the privacy policy and the terms of use.
 * Fill `operator` and `inn` with the registered company before launch; until then the documents name
 * the service (brand.name). When a new data purpose or provider appears, update lib/legal/privacy.ts,
 * its `updated` date, and bump CONSENT_VERSION in lib/analytics/consent.ts if it needs fresh consent.
 */
import type { LText } from "@/lib/data/types";

export const legal: {
  /** legal entity, e.g. «ОсОО "…"»; empty → the brand name is used */
  operator: LText;
  /** registration number (ИНН); shown only when filled */
  inn: string;
  address: LText;
  email: string;
} = {
  operator: { ru: "", en: "" },
  inn: "",
  address: { ru: "Кыргызская Республика, г. Бишкек", en: "Bishkek, Kyrgyz Republic" },
  email: "support@eventusai.app",
};
