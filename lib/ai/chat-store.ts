"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "@/lib/utils";
import type { ChatMessage } from "./protocol";

export interface Thread {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface ChatState {
  threads: Thread[];
  create: (userId: string, firstText: string) => string;
  append: (threadId: string, message: ChatMessage) => void;
  remove: (threadId: string) => void;
  clearAll: () => void;
}

const uid = () => `t-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      threads: [],
      create: (userId, firstText) => {
        const id = uid();
        const ts = new Date().toISOString();
        const title = firstText.trim().replace(/\s+/g, " ").slice(0, 60);
        set((s) => ({ threads: [{ id, userId, title, createdAt: ts, updatedAt: ts, messages: [] }, ...s.threads] }));
        return id;
      },
      append: (threadId, message) =>
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId ? { ...t, messages: [...t.messages, message], updatedAt: new Date().toISOString() } : t,
          ),
        })),
      remove: (threadId) => set((s) => ({ threads: s.threads.filter((t) => t.id !== threadId) })),
      clearAll: () => set({ threads: [] }),
    }),
    {
      name: "eventus-chats-v1",
      storage: createJSONStorage(() => safeStorage("localStorage")),
      partialize: (s) => ({ threads: s.threads.slice(0, 30) }),
    },
  ),
);
