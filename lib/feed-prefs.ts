"use client";

/** Per-device feed conveniences: recent searches, posts marked «not interested». */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "./utils";

interface FeedPrefs {
  recent: string[];
  remember: (q: string) => void;
  forget: (q?: string) => void;
  hidden: string[];
  hidePost: (id: string) => void;
}

export const useFeedPrefs = create<FeedPrefs>()(
  persist(
    (set) => ({
      recent: [],
      hidden: [],
      hidePost: (id) => set((s) => ({ hidden: [id, ...s.hidden.filter((x) => x !== id)].slice(0, 300) })),
      remember: (q) => {
        const clean = q.trim().slice(0, 60);
        if (clean.length < 2) return;
        set((s) => ({ recent: [clean, ...s.recent.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, 6) }));
      },
      forget: (q) => set((s) => ({ recent: q ? s.recent.filter((x) => x !== q) : [] })),
    }),
    { name: "eventus-feed", storage: createJSONStorage(() => safeStorage("localStorage")) },
  ),
);
