"use client";

/** Onboarding progress per account, kept in localStorage so a reload resumes the chat. */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "@/lib/utils";
import type { Answers, StepId } from "./script";

export interface LogEntry {
  /** the step that was being asked when the user replied */
  step: StepId;
  /** what the user bubble shows */
  text: string;
  /** steps this reply answered (empty → the assistant asks again) */
  filled: StepId[];
}

export interface Draft {
  answers: Answers;
  log: LogEntry[];
}

interface DraftState {
  drafts: Record<string, Draft>;
  set: (userId: string, draft: Draft) => void;
  clear: (userId: string) => void;
}

export const useOnboardingDraft = create<DraftState>()(
  persist(
    (set) => ({
      drafts: {},
      set: (userId, draft) => set((s) => ({ drafts: { ...s.drafts, [userId]: draft } })),
      clear: (userId) =>
        set((s) => {
          const next = { ...s.drafts };
          delete next[userId];
          return { drafts: next };
        }),
    }),
    { name: "eventus-onboarding", storage: createJSONStorage(() => safeStorage("localStorage")) },
  ),
);
