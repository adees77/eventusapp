import { describe, expect, it } from "vitest";
import { SEED_SPECS } from "../seed/specs";
import { SEED_VENDORS } from "../seed/vendors";
import { CATEGORY_SPECS, perLabel, priceOf, sanitizeSpecs, specFacts, specFields, specsProgress, unitFromPeriod } from "../specs";

const sp = (s: string) => s.replace(/\s/g, " ");

describe("vendor specs schema", () => {
  it("every category has a schema with unique field ids and at least one price", () => {
    for (const [cat, groups] of Object.entries(CATEGORY_SPECS)) {
      const fields = groups.flatMap((g) => g.fields);
      const ids = fields.map((f) => f.id);
      expect(new Set(ids).size, cat).toBe(ids.length);
      const hasPrice = fields.some((f) => f.kind === "price" || (f.kind === "list" && f.item.some((it) => it.kind === "price")) || f.id === "minOrder");
      expect(hasPrice, cat).toBe(true);
    }
  });

  it("halls have banquet menus with price, minimum guests and dishes", () => {
    const menus = specFields("halls").find((f) => f.id === "menus");
    expect(menus?.kind).toBe("list");
    if (menus?.kind === "list") expect(menus.item.map((i) => i.kind)).toEqual(["text", "price", "number", "longtext"]);
  });

  it("demo specs survive sanitising unchanged", () => {
    for (const v of SEED_VENDORS) {
      const specs = SEED_SPECS[v.slug];
      expect(specs, v.slug).toBeDefined();
      const clean = JSON.parse(JSON.stringify(sanitizeSpecs(v.category, specs)));
      const raw = JSON.parse(JSON.stringify(specs, (_k, x) => (x === "" || x === false ? undefined : x)));
      expect(clean, v.slug).toEqual(raw);
    }
  });
});

describe("prices with a period", () => {
  it("reads «за час», «за 4 часа», «за мероприятие», «за гостя»", () => {
    expect(perLabel("hour", 1, "ru")).toBe("за час");
    expect(perLabel("hour", 4, "ru")).toBe("за 4 часа");
    expect(perLabel("day", 5, "ru")).toBe("за 5 дней");
    expect(perLabel("event", undefined, "ru")).toBe("за мероприятие");
    expect(perLabel("guest", 1, "ru")).toBe("за гостя");
    expect(perLabel("person", 1, "ru")).toBe("за человека");
    expect(perLabel("minute", 1, "ru")).toBe("за минуту");
    expect(perLabel("hour", 4, "en")).toBe("per 4 hours");
    // the accusative also for numbers in the "one" class
    expect(perLabel("minute", 21, "ru")).toBe("за 21 минуту");
    expect(perLabel("guest", 31, "ru")).toBe("за 31 гостя");
    expect(perLabel("hour", 21, "ru")).toBe("за 21 час");
    expect(perLabel("minute", 22, "ru")).toBe("за 22 минуты");
  });

  it("formats a stored price triple", () => {
    expect(sp(priceOf({ price: 15000, priceQty: 4, pricePer: "hour" }, "price")!.ru)).toBe("15 000 сом за 4 часа");
    expect(sp(priceOf({ price: 30000, pricePer: "day" }, "price")!.ru)).toBe("30 000 сом за день");
    expect(priceOf({}, "price")).toBeNull();
    expect(priceOf({ price: 3000, pricePer: "hour" }, "price")!.en).toBe("3,000 som per hour");
  });

  it("sanitises: unknown period → first allowed, qty 1 dropped, no amount → nothing", () => {
    const out = sanitizeSpecs("cars", {
      fleet: [{ model: "G", price: 3000, pricePer: "kg", priceQty: 1 }, { price: 0, pricePer: "day" }],
      minRent: 2.4,
      minRentPer: "day",
      overtime: 3000,
      overtimeQty: 2,
    });
    expect(out).toEqual({
      fleet: [{ model: "G", price: 3000, pricePer: "hour" }],
      minRent: 2,
      minRentPer: "day",
      overtime: 3000,
      overtimePer: "hour",
      overtimeQty: 2,
    });
  });

  it("builds offer units from a period", () => {
    expect(unitFromPeriod("hour", 4)).toEqual({ ru: "4 часа", en: "4 hours" });
    expect(unitFromPeriod("event", 1)).toEqual({ ru: "мероприятие", en: "event" });
  });
});

describe("facts and progress", () => {
  it("sums list quantities, fills templates, agrees plurals", () => {
    const facts = specFacts("cars", { fleet: [{ model: "A", count: 8 }, { model: "B", count: 4 }], minRent: 4, minRentPer: "hour" });
    expect(facts.map((f) => f.ru)).toEqual(["12 авто", "мин. 4 часа"]);
    const hall = specFacts("halls", { banquet: 500, area: 1100 });
    expect(hall.map((f) => sp(f.ru))).toEqual(["до 500 гостей", "1 100 м²"]);
    expect(hall.map((f) => f.en)).toEqual(["up to 500 guests", "1,100 m²"]);
    expect(specFacts("halls", { rooms: [{ name: "A" }] }).map((f) => f.ru)).toEqual(["1 зал"]);
  });

  it("progress is the share of filled fields", () => {
    expect(specsProgress("shows", {})).toBe(0);
    const all = Object.fromEntries(specFields("shows").map((f) => [f.id, f.kind === "bool" ? true : f.kind === "multi" ? ["fire"] : f.kind === "list" ? [{ name: "x" }] : 1]));
    expect(specsProgress("shows", all)).toBe(1);
  });
});
