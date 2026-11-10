import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/data/seed";
import { migrate } from "@/lib/data/store";
import type { DB } from "@/lib/data/types";
import { designFromLegacy, duplicateBlock, guestStatus, guestsCsv, invitationStats, moveBlock } from "../design";

describe("invitation design", () => {
  it("converts a legacy invitation into blocks", () => {
    const d = designFromLegacy({ style: "night", occasion: "birthday", heading: "Приглашаем", names: "Алина", message: "Ждём", dressCode: "Black tie", contact: "+996", photo: undefined });
    expect(d.theme.id).toBe("night");
    expect(d.blocks[0]).toMatchObject({ type: "cover", props: { kicker: "Приглашаем", title: "Алина" } });
    expect(d.blocks.map((b) => b.type)).toEqual(["cover", "text", "date", "countdown", "venue", "schedule", "dresscode", "rsvp", "contacts"]);
  });

  it("moves and duplicates blocks immutably", () => {
    const { blocks } = designFromLegacy({ style: "classic", occasion: "wedding", heading: "", names: "", message: "", dressCode: undefined, contact: undefined, photo: undefined });
    const moved = moveBlock(blocks, 0, 2);
    expect(moved[2].id).toBe(blocks[0].id);
    expect(blocks[0].type).toBe("cover");
    const dup = duplicateBlock(blocks, blocks[1].id);
    expect(dup).toHaveLength(blocks.length + 1);
    expect(dup[2].id).not.toBe(blocks[1].id);
    expect(dup[2].type).toBe(blocks[1].type);
  });

  it("counts the funnel from guests, views and answers", () => {
    const inv = buildSeed().invitations[0];
    const s = invitationStats(inv);
    expect(s.guests).toBe(13);
    expect(s.sent).toBe(11);
    expect(s.opened).toBe(9);
    expect(s.coming).toBe(4);
    expect(s.declined).toBe(1);
    expect(s.persons).toBe(9);
    expect(guestStatus(inv, inv.guests[0])).toBe("coming");
    expect(guestStatus(inv, inv.guests[11])).toBe("draft");
    const csv = guestsCsv(inv, { draft: "-", sent: "S", opened: "O", coming: "Y", declined: "N" });
    expect(csv.split("\n")).toHaveLength(1 + 13 + 1);
  });
});

describe("store migration v2 → v3", () => {
  it("keeps user data and adds the new collections", () => {
    const seed = buildSeed();
    const v2 = {
      ...seed,
      version: 2,
      users: [...seed.users, { id: "u-new", role: "client", name: "Новый" }],
      bookings: seed.bookings.map(({ escrow, ...b }) => (void escrow, b)),
      invitations: seed.invitations.map(({ design, guests, views, ...inv }) => (void design, void guests, void views, inv)),
    } as unknown as Partial<DB>;
    delete v2.posts;
    delete v2.transactions;
    delete v2.settings;
    const db = migrate(v2 as DB);
    expect(db.version).toBe(3);
    expect(db.users.some((u) => u.id === "u-new")).toBe(true);
    expect(db.posts.length).toBeGreaterThan(50);
    expect(db.settings.feePercent).toBe(5);
    expect(db.bookings.find((b) => b.id === "b-ak-2")?.escrow?.state).toBe("held");
    expect(db.invitations[0].design.blocks.length).toBeGreaterThan(3);
  });
});
