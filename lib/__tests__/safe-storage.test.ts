import { afterEach, expect, test, vi } from "vitest";
import { safeStorage } from "@/lib/utils";

afterEach(() => vi.unstubAllGlobals());

test("falls back to memory when browser storage is blocked", () => {
  const blocked = {};
  Object.defineProperty(blocked, "localStorage", {
    get() {
      throw new Error("SecurityError: storage is blocked");
    },
  });
  vi.stubGlobal("window", blocked);

  const s = safeStorage("localStorage");
  s.setItem("k", "v");
  expect(s.getItem("k")).toBe("v");
  // same in-memory store on the next call
  expect(safeStorage("localStorage").getItem("k")).toBe("v");
});

test("uses real storage when it works", () => {
  const map = new Map<string, string>();
  const real = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
  vi.stubGlobal("window", { sessionStorage: real });
  expect(safeStorage("sessionStorage")).toBe(real);
});
