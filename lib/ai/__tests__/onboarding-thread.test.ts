import { beforeEach, describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/data/seed";
import { useDataStore } from "@/lib/data/store";
import { useChatStore } from "../chat-store";
import { importOnboardingThread } from "../onboarding-thread";
import type { ChatContentBlock } from "../protocol";

const actor = { id: "u-new", role: "client" as const };
const base = {
  title: "Свадьба",
  transcript: [
    { from: "bot" as const, text: "Здравствуйте!" },
    { from: "bot" as const, text: "Что празднуем?" },
    { from: "user" as const, text: "Свадьба 14 июня 2027, Бишкек, 150 гостей" },
    { from: "bot" as const, text: "Всё верно?" },
  ],
  confirmText: "Всё верно",
  date: "2027-06-14",
  city: "bishkek",
  guests: 150,
  priorities: ["halls" as const],
  intro: "Вот кто свободен:",
  outro: "Что дальше?",
  none: "Никого нет",
};

describe("onboarding → first assistant thread", () => {
  beforeEach(() => {
    useDataStore.setState({ db: buildSeed(), hydrated: true });
    useChatStore.setState({ threads: [], active: {} });
  });

  it("keeps the dialog, ends with vendor picks and opens the thread", () => {
    const id = importOnboardingThread(actor, "ru", base);
    const { threads, active } = useChatStore.getState();
    expect(active[actor.id]).toBe(id);
    const msgs = threads.find((t) => t.id === id)!.messages;
    // consecutive bot lines merge; roles alternate
    expect(msgs[0]).toEqual({ role: "assistant", content: "Здравствуйте!\n\nЧто празднуем?" });
    msgs.slice(1).forEach((m, i) => expect(m.role).not.toBe(msgs[i].role));
    // every tool_use has its result in the next message
    const picks = msgs.find((m) => Array.isArray(m.content) && (m.content as ChatContentBlock[]).some((b) => b.type === "tool_use"))!;
    const uses = (picks.content as ChatContentBlock[]).filter((b) => b.type === "tool_use");
    const results = msgs[msgs.indexOf(picks) + 1].content as ChatContentBlock[];
    expect(uses.length).toBeGreaterThan(0);
    expect(results.map((r) => r.type === "tool_result" && r.tool_use_id)).toEqual(uses.map((u) => u.type === "tool_use" && u.id));
    expect(msgs.at(-1)).toEqual({ role: "assistant", content: "Что дальше?" });
  });
});
