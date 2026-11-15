"use client";

import { AnyDevice } from "@/components/landing/any-device";
import { Bento } from "@/components/landing/bento";
import { CategoryStrip } from "@/components/landing/category-strip";
import { Deal } from "@/components/landing/deal";
import { Faq } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Packages } from "@/components/landing/packages";
import { Reviews } from "@/components/landing/reviews";

/** Landing for visitors without an account. Signed-in users are routed to their home by AppShell. */
export default function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <Hero />
      <CategoryStrip />
      <AnyDevice />
      <Bento />
      <Deal />
      <Packages />
      <Reviews />
      <Faq />
      <Footer />
    </div>
  );
}
