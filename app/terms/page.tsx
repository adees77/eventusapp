"use client";

import { LegalPage } from "@/components/legal/legal-page";
import { TERMS } from "@/lib/legal/terms";

/** Terms of use */
export default function TermsPage() {
  return <LegalPage doc={TERMS} />;
}
