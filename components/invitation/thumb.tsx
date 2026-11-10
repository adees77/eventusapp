"use client";

import type { Invitation } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { InvitationPage, type PageData } from "./page/invitation-page";

/**
 * A live miniature of the invitation page: the first screen at 5:7,
 * rendered by the real renderer at phone width and scaled down.
 */
export function InvitationThumb({ inv, className }: { inv: PageData | Invitation; className?: string }) {
  return (
    <div className={cn("relative aspect-[5/7] overflow-hidden rounded-xl bg-muted shadow-lift ring-1 ring-black/5", className)} aria-hidden>
      <div
        className="pointer-events-none absolute top-0 left-0 w-[390px] origin-top-left"
        style={{ scale: "var(--thumb-scale)" }}
        ref={(el) => {
          if (!el?.parentElement) return;
          const fit = () => el.style.setProperty("--thumb-scale", String(el.parentElement!.clientWidth / 390));
          fit();
          const ro = new ResizeObserver(fit);
          ro.observe(el.parentElement);
          return () => ro.disconnect();
        }}
      >
        <InvitationPage data={{ ...inv, design: { ...inv.design, blocks: inv.design.blocks.slice(0, 2) } }} mode="thumb" />
      </div>
    </div>
  );
}
