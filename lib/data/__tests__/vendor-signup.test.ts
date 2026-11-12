import { beforeEach, describe, expect, it } from "vitest";
import { registerOwnVendor, signUpVendor, upsertAuthUser } from "../actions";
import { buildSeed } from "../seed";
import { getDB, useDataStore } from "../store";

const input = {
  ownerName: "Айбек",
  name: "Тест Холл",
  category: "halls" as const,
  city: "bishkek",
  tagline: "Банкетный зал в центре",
  specs: { banquet: 350, area: 700, rooms: [{ name: "Большой", seats: 250 }, {}] },
  photos: ["data:image/jpeg;base64,AAA", "data:image/jpeg;base64,BBB"],
  offer: { title: "Банкет", price: 150000, unit: { ru: "мероприятие", en: "event" } },
};

describe("vendor sign-up (the /onboarding/vendor finish)", () => {
  beforeEach(() => useDataStore.setState({ db: buildSeed(), hydrated: true }));

  it("creates profile, details, photos, first offer and post, and finishes onboarding in ONE store write", () => {
    const u = upsertAuthUser({ email: "new@vendor.kg", name: "Айбек", provider: "google" });
    let writes = 0;
    const unsub = useDataStore.subscribe(() => writes++);
    const { vendor, offerId, postId } = signUpVendor({ id: u.id, role: "client" }, input);
    unsub();

    expect(writes).toBe(1);
    const db = getDB();
    expect(db.users.find((x) => x.id === u.id)).toMatchObject({ needsOnboarding: false, role: "vendor", name: "Айбек" });
    const v = db.vendors.find((x) => x.id === vendor.id)!;
    expect(v.specs).toEqual({ banquet: 350, area: 700, rooms: [{ name: "Большой", seats: 250 }] });
    expect(v.cover).toBe(input.photos[0]);
    expect(v.portfolio.slice(0, 2)).toEqual(input.photos);
    expect(db.offers.find((o) => o.id === offerId)).toMatchObject({ price: 150000, unit: { ru: "мероприятие", en: "event" }, active: true });
    expect(db.posts.find((p) => p.id === postId)).toMatchObject({ vendorId: vendor.id, offerId, photos: input.photos });
  });

  it("finishes an interrupted earlier attempt by reusing its vendor instead of creating a second one", () => {
    const u = upsertAuthUser({ email: "half@vendor.kg", provider: "email" });
    registerOwnVendor({ id: u.id, role: "client" }, { ownerName: "", name: "Half", category: "cars", city: "osh", tagline: "Кортеж" });
    // simulate the lost onboarding write
    useDataStore.setState((s) => ({ db: { ...s.db!, users: s.db!.users.map((x) => (x.id === u.id ? { ...x, needsOnboarding: true, role: "client" as const } : x)) } }));

    signUpVendor({ id: u.id, role: "client" }, { ...input, category: "cars", specs: {} });
    const db = getDB();
    expect(db.users.find((x) => x.id === u.id)).toMatchObject({ needsOnboarding: false, role: "vendor" });
    const mine = db.vendors.filter((v) => v.ownerId === u.id);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ name: "Тест Холл", category: "cars" });
  });

  it("refuses admins", () => {
    expect(() => signUpVendor({ id: "u-admin", role: "admin" }, input)).toThrow();
  });
});
