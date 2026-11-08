"use client";

/**
 * What the client is planning right now: the selected date, city and guests.
 * Shared by the assistant, catalog, vendor profile and booking, so a date
 * picked anywhere follows the user everywhere.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { serverStorage } from "./utils";

interface PlannerState {
  date: string | null;
  city: string | null;
  guests: number | null;
  set: (patch: Partial<Pick<PlannerState, "date" | "city" | "guests">>) => void;
}

export const usePlanner = create<PlannerState>()(
  persist(
    (set) => ({
      date: null,
      city: null,
      guests: null,
      set: (patch) => set(patch),
    }),
    {
      name: "eventus-planner",
      storage: createJSONStorage(() => (typeof window === "undefined" ? serverStorage : localStorage)),
      partialize: ({ date, city, guests }) => ({ date, city, guests }),
    },
  ),
);
