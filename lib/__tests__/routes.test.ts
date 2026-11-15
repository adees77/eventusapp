import { describe, expect, it } from "vitest";
import { routes } from "../routes";

describe("routes", () => {
  it("builds the dynamic URLs the pages expect", () => {
    expect(routes.vendor("altyn-kortezh")).toBe("/vendors/altyn-kortezh");
    expect(routes.vendor("altyn-kortezh", "posts")).toBe("/vendors/altyn-kortezh");
    expect(routes.vendor("altyn-kortezh", "reviews")).toBe("/vendors/altyn-kortezh?tab=reviews");
    expect(routes.book("o-1", { date: "2027-06-14", qty: 2 })).toBe("/book/o-1?date=2027-06-14&qty=2");
    expect(routes.book("o-1", { date: null })).toBe("/book/o-1");
    expect(routes.invitation("inv", "design")).toBe("/invitations/inv");
    expect(routes.feedWith({ category: "cars" })).toBe("/vendors?category=cars");
    expect(routes.ask("Свадьба на 150")).toBe("/assistant?q=%D0%A1%D0%B2%D0%B0%D0%B4%D1%8C%D0%B1%D0%B0+%D0%BD%D0%B0+150");
  });
});
