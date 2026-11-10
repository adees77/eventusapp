import { describe, expect, it } from "vitest";
import {
  dateChip,
  parseBudget,
  parseCategories,
  parseCity,
  parseDate,
  parseEventType,
  parseGuests,
  parseName,
  parsePhone,
  parseRole,
} from "../parse";

const NOW = new Date("2026-11-09T10:00:00");

describe("parseDate", () => {
  it("reads day + month in Russian and English", () => {
    expect(parseDate("15 августа", NOW)).toBe("2027-08-15");
    expect(parseDate("свадьба 3 декабря", NOW)).toBe("2026-12-03");
    expect(parseDate("August 15", NOW)).toBe("2027-08-15");
    expect(parseDate("15th of june", NOW)).toBe("2027-06-15");
  });
  it("reads numeric dates and ISO", () => {
    expect(parseDate("15.08", NOW)).toBe("2027-08-15");
    expect(parseDate("20.12.2026", NOW)).toBe("2026-12-20");
    expect(parseDate("2027-05-01", NOW)).toBe("2027-05-01");
  });
  it("rejects past explicit dates and impossible days", () => {
    expect(parseDate("01.01.2026", NOW)).toBeNull();
    expect(parseDate("31 февраля", NOW)).toBeNull();
  });
  it("picks a mid-month Saturday for a month only", () => {
    const d = parseDate("в июне", NOW)!;
    expect(d.startsWith("2027-06-")).toBe(true);
    expect(new Date(d).getDay()).toBe(6);
  });
  it("understands relative phrases", () => {
    expect(parseDate("через 3 месяца", NOW)).toBe("2027-02-09");
    expect(parseDate("in 2 weeks", NOW)).toBe("2026-11-23");
    expect(parseDate("летом", NOW)!.startsWith("2027-07")).toBe(true);
  });
  it("does not mistake a budget for a date", () => {
    expect(parseDate("1.5 млн", NOW)).toBeNull();
    expect(parseDate("бюджет 2.5м", NOW)).toBeNull();
  });
});

describe("numbers", () => {
  it("guests", () => {
    expect(parseGuests("150")).toBe(150);
    expect(parseGuests("человек 200")).toBe(200);
    expect(parseGuests("150-200 гостей")).toBe(200);
    expect(parseGuests("около ста")).toBe(100);
    expect(parseGuests("15 августа", true)).toBeNull();
    expect(parseGuests("свадьба 15 августа, человек 200", true)).toBe(200);
  });
  it("budget", () => {
    expect(parseBudget("2 млн")).toBe(2_000_000);
    expect(parseBudget("1,5 млн")).toBe(1_500_000);
    expect(parseBudget("500к")).toBe(500_000);
    expect(parseBudget("800 тыс сом")).toBe(800_000);
    expect(parseBudget("1 500 000")).toBe(1_500_000);
    expect(parseBudget("200 гостей", true)).toBeNull();
  });
});

describe("words", () => {
  it("event types", () => {
    expect(parseEventType("Свадьба")).toBe("wedding");
    expect(parseEventType("у нас той")).toBe("toi");
    expect(parseEventType("корпоратив для офиса")).toBe("corporate");
    expect(parseEventType("birthday party")).toBe("birthday");
    expect(parseEventType("просто встреча")).toBeNull();
  });
  it("cities", () => {
    expect(parseCity("в Бишкеке")).toBe("bishkek");
    expect(parseCity("Ош")).toBe("osh");
    expect(parseCity("на Иссык-Куле")).toBe("cholpon-ata");
    expect(parseCity("Алматы")).toBeNull();
    expect(parseCity("хороший")).toBeNull();
  });
  it("categories", () => {
    expect(parseCategories("нужен зал и фотограф")).toEqual(["halls", "photo"]);
    expect(parseCategories("we rent cars")).toEqual(["cars"]);
  });
  it("roles and names", () => {
    expect(parseRole("я подрядчик")).toBe("vendor");
    expect(parseRole("планирую свадьбу")).toBe("client");
    expect(parseName("меня зовут айгерим")).toBe("Айгерим");
    expect(parseName("Айгерим, планирую свадьбу")).toBe("Айгерим");
    expect(parseName("a@b.c")).toBeNull();
  });
  it("phones", () => {
    expect(parsePhone("0700 123 456")).toBe("+996 700 123 456");
    expect(parsePhone("+996 555 12 34 56")).toBe("+996 555 123 456");
    expect(parsePhone("123")).toBeNull();
  });
});

describe("dateChip", () => {
  it("lands on a Saturday in the future", () => {
    for (const c of ["month", "3m", "6m", "year"] as const) {
      const d = new Date(dateChip(c, NOW));
      expect(d.getDay()).toBe(6);
      expect(d > NOW).toBe(true);
    }
  });
});
