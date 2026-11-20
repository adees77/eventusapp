"use client";

import { Footer } from "@/components/landing/footer";
import { Story } from "@/components/landing/story";

/** The same landing as «/», reachable with an account too (from the profile, the landing's own logo and tabs) */
export default function LandingAnyone() {
  return (
    <div className="min-h-dvh bg-background">
      <Story />
      <Footer />
    </div>
  );
}
