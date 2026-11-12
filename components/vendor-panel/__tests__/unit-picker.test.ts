import { describe, expect, it } from "vitest";
import { parseUnit, unitText } from "../unit-picker";

describe("parseUnit", () => {
  it("reads a period back from its text", () => {
    expect(parseUnit({ ru: "4 часа", en: "4 hours" }, "ru", "cars")).toMatchObject({ per: "hour", qty: 4 });
    expect(parseUnit({ ru: "вечер", en: "evening" }, "ru", "halls")).toMatchObject({ per: "evening", qty: 1 });
  });
  it("falls back to the other language when the UI one is empty", () => {
    expect(parseUnit({ ru: "комплект", en: "" }, "en", "furniture")).toMatchObject({ per: "set" });
    expect(parseUnit({ ru: "авто · 4 часа", en: "" }, "en", "cars")).toMatchObject({ per: "custom", text: "авто · 4 часа" });
  });
  it("keeps unknown text as a custom unit", () => {
    const v = parseUnit({ ru: "авто · 4 часа", en: "car · 4 hours" }, "ru", "cars");
    expect(v).toMatchObject({ per: "custom", text: "авто · 4 часа" });
    expect(unitText(v)).toEqual({ ru: "авто · 4 часа", en: "авто · 4 часа" });
  });
});
