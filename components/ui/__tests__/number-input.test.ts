import { describe, expect, it } from "vitest";
import { parseNumber } from "../number-input";

describe("parseNumber", () => {
  it("keeps decimals and accepts a comma", () => {
    expect(parseNumber("2.5", true)).toBe(2.5);
    expect(parseNumber("2,5", true)).toBe(2.5);
    expect(parseNumber("2.", true)).toBe(2);
  });
  it("ignores spaces and stray dots instead of producing NaN", () => {
    expect(parseNumber("1 500", true)).toBe(1500);
    expect(parseNumber("1.2.3", true)).toBe(1.23);
    expect(parseNumber(".", true)).toBeUndefined();
    expect(parseNumber("", true)).toBeUndefined();
  });
  it("integers only when decimals are off", () => {
    expect(parseNumber("12", false)).toBe(12);
    expect(parseNumber("2.5", false)).toBe(25);
  });
});
