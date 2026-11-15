"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { viewerSequence } from "@/lib/data/feed";
import { readSimilarPosts, usePostIndex } from "@/lib/data/views/feed";
import type { Post } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { PostView } from "./post-view";

const STEP = 3;

/** Posts most like this one: same category first, then same city, then the most liked */
/**
 * Full-screen post viewer, one publication per screen (like Reels / Shorts):
 * the photo fills the frame, the caption and booking bar sit over it at the
 * bottom, and the actions run down the right edge. Scrolling snaps to the next
 * post of the list it was opened from (`order`).
 */
export function PostDialog({
  postId,
  order,
  onOpenChange,
}: {
  postId: string | null;
  /** post ids of the list the viewer was opened from, in display order */
  order?: string[];
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const posts = usePostIndex();
  // the order is frozen when a post is opened: a like must not reshuffle what is under the finger
  const [view, setView] = useState<{ id: string | null; seq: string[]; n: number; similar: Record<string, string> }>({
    id: null,
    seq: [],
    n: STEP,
    similar: {},
  });

  const byId = new Map(posts.map((p) => [p.id, p]));
  const seq = view.seq.flatMap((id) => {
    const p = byId.get(id);
    return p && (!p.hidden || id === postId) ? [p] : [];
  });
  const shown = seq.slice(0, view.n);
  const open = !!postId && shown.length > 0;

  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  if (view.id !== postId) {
    setView({ id: postId, seq: postId ? viewerSequence(order ?? [], postId) : [], n: STEP, similar: {} });
    setActive(0);
  }

  useEffect(() => {
    scroller?.scrollTo({ top: 0 });
  }, [postId, scroller]);

  // nothing left to show (the owner deleted the last post, a stale ?post= link): tell the parent so it clears its selection
  useEffect(() => {
    if (postId && !open) onOpenChange(false);
  }, [postId, open, onOpenChange]);

  // an open comments/reviews sheet: Escape and the arrow keys belong to it, not to the whole viewer
  const sheetCloser = useRef<(() => void) | null>(null);
  const registerSheet = useCallback((close: (() => void) | null) => {
    sheetCloser.current = close;
  }, []);

  const onScroll = useCallback(() => {
    if (!scroller) return;
    const i = Math.round(scroller.scrollTop / scroller.clientHeight);
    setActive(i);
    // keep a couple of screens rendered ahead of the finger
    setView((v) => (i + 2 >= v.n ? { ...v, n: v.n + STEP } : v));
  }, [scroller]);

  const goTo = useCallback(
    (i: number) => {
      if (!scroller) return;
      scroller.scrollTo({ top: i * scroller.clientHeight, behavior: "smooth" });
    },
    [scroller],
  );

  /** «Показать похожее»: the posts right after the current one become similar ones, and we scroll to them */
  function showSimilar(post: Post, vendorName: string) {
      // indexes of what is actually rendered (deleted / hidden posts are already filtered out)
      const ids = seq.map((p) => p.id);
      const i = ids.indexOf(post.id);
      const head = ids.slice(0, i + 1);
      const similar = readSimilarPosts(post, new Set(head));
      if (!similar.length) return toast(t("feed.similarNone"));
      const rest = ids.slice(i + 1).filter((id) => !similar.includes(id));
      const tag = Object.fromEntries(similar.map((id) => [id, vendorName]));
      setView((v) => ({ ...v, seq: [...head, ...similar, ...rest], n: Math.max(v.n, i + 1 + STEP), similar: { ...v.similar, ...tag } }));
      requestAnimationFrame(() => goTo(i + 1));
  }

  function onKey(e: React.KeyboardEvent) {
    if (sheetCloser.current || (e.target as HTMLElement).closest("input, textarea")) return;
    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault();
      goTo(Math.min(active + 1, seq.length - 1));
    } else if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault();
      goTo(Math.max(active - 1, 0));
    }
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        // Escape / outside press with a sheet open closes the sheet only
        if (!next && sheetCloser.current) return sheetCloser.current();
        onOpenChange(next);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className="fixed inset-0 z-50 bg-black text-white outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onKeyDown={onKey}
        >
          <DialogPrimitive.Title className="sr-only">{t("nav.feed")}</DialogPrimitive.Title>
          <div
            ref={setScroller}
            onScroll={onScroll}
            className="no-scrollbar h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain"
          >
            {shown.map((p, k) => (
              <PostView
                key={p.id}
                post={p}
                near={Math.abs(k - active) <= 1}
                similarTo={view.similar[p.id]}
                onSimilar={showSimilar}
                registerSheet={registerSheet}
              />
            ))}
          </div>

          <DialogPrimitive.Close
            aria-label={t("feed.close")}
            className="absolute top-[max(12px,env(safe-area-inset-top))] left-3 z-10 flex size-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition-colors hover:bg-black/50 md:top-5 md:left-5 md:bg-white/10 md:hover:bg-white/20"
          >
            <X className="size-5" strokeWidth={1.75} />
          </DialogPrimitive.Close>

          <div className="absolute top-1/2 right-6 hidden -translate-y-1/2 flex-col gap-3 md:flex">
            <NavBtn label={t("feed.prev")} disabled={active === 0} onClick={() => goTo(active - 1)}>
              <ChevronUp className="size-5" />
            </NavBtn>
            <NavBtn label={t("feed.next")} disabled={active >= seq.length - 1} onClick={() => goTo(active + 1)}>
              <ChevronDown className="size-5" />
            </NavBtn>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function NavBtn({ children, label, disabled, onClick }: { children: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
