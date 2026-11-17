"use client";

import { Footer } from "@/components/landing/footer";
import { Story } from "@/components/landing/story";

/** Landing for visitors without an account: one scroll story, then the footer. Signed-in users are routed to their home by AppShell. */
export default function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <Story />
      <Footer />
    </div>
  );
}
