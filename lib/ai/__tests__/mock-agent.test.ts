import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/data/seed";
import { mockTurn, parseSlots } from "../mock-agent";
import type { ChatContext, ChatMessage } from "../protocol";
import { executeTool } from "../tool-exec";

const today = "2026-11-08";
const ctx: ChatContext = { locale: "ru", today };

describe("parseSlots", () => {
  it("understands the canonical demo request", () => {
    const s = parseSlots("Организую свадьбу 14 июня в Бишкеке, 150 гостей, нужен кортеж из 5 геликов", today);
    expect(s).toMatchObject({ category: "cars", date: "2027-06-14", guests: 150, qty: 5, city: "bishkek", query: "G-Class" });
  });

  it("parses numeric and English dates", () => {
    expect(parseSlots("зал на 20.12", today).date).toBe("2026-12-20");
    expect(parseSlots("hall on June 3", today).date).toBe("2027-06-03");
    expect(parseSlots("ведущий на 2027-05-01", today).date).toBe("2027-05-01");
  });

  it("does not confuse март with май", () => {
    expect(parseSlots("8 марта", today).date).toBe("2027-03-08");
    expect(parseSlots("8 мая", today).date).toBe("2027-05-08");
  });
});

describe("mockTurn", () => {
  it("asks for a date when it is missing", () => {
    const t = mockTurn([{ role: "user", content: "Нужен ведущий" }], ctx);
    expect(t.toolUse).toBeUndefined();
    expect(t.text).toMatch(/дату/);
  });

  it("uses the event date from context and calls search_vendors", () => {
    const t = mockTurn([{ role: "user", content: "Нужен кортеж" }], {
      ...ctx,
      event: { title: "Свадьба", date: "2027-06-14", guests: 150 },
    });
    expect(t.toolUse?.name).toBe("search_vendors");
    expect(t.toolUse?.input).toMatchObject({ category: "cars", date: "2027-06-14" });
  });

  it("summarises real tool results without inventing vendors", () => {
    const db = buildSeed(new Date(`${today}T10:00:00`));
    const input = { category: "cars", date: "2027-06-14", qty: 5, query: "G-Class" };
    const result = executeTool("search_vendors", input, db, { id: "u-client", role: "client" }, "ru");
    const messages: ChatMessage[] = [
      { role: "user", content: "кортеж из 5 геликов на 14 июня" },
      { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "search_vendors", input }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: JSON.stringify(result) }] },
    ];
    const t = mockTurn(messages, ctx);
    const names = db.vendors.map((v) => v.name);
    expect(names.some((n) => t.text.includes(n))).toBe(true);
    expect("vendors" in result && result.vendors.every((v) => v.offer && v.offer.free >= 5 && /G-Class/.test(v.offer.title))).toBe(true);
  });
});
