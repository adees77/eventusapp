import { beforeEach, describe, expect, it } from "vitest";
import { mockVendorReply } from "@/lib/ai/vendor-mock";
import { parseBookingMarkers, vendorChatRequestSchema } from "@/lib/ai/vendor-protocol";
import { asActor, ensureConversation, postAssistantReply, sendMessage, updateVendor } from "../actions";
import { assistantActive, type Actor } from "../policies";
import { buildSeed } from "../seed";
import { getDB, useDataStore } from "../store";
import { selectAssistantRequest } from "../views/messaging";

const client: Actor = { id: "u-client", role: "client" };

async function chatWithFirstVendor() {
  const v = getDB().vendors.find((x) => !x.hidden && getDB().offers.some((o) => o.vendorId === x.id && o.active))!;
  const id = await asActor(client, () => ensureConversation(v.id));
  return { v, id, owner: { id: v.ownerId, role: "vendor" } as Actor };
}

describe("vendor AI assistant", () => {
  beforeEach(() => useDataStore.setState({ db: buildSeed(), hydrated: true }));

  it("answers in the vendor's own chat, as the vendor, marked as AI", async () => {
    const { v, id } = await chatWithFirstVendor();
    await asActor(client, () => sendMessage(id, "Сколько стоит?"));
    const offer = getDB().offers.find((o) => o.vendorId === v.id && o.active)!;
    await asActor(client, () => postAssistantReply(id, "Здравствуйте! Цена — 10 000 сом.", [offer.id, "o-foreign"]));
    const last = getDB().messages.filter((m) => m.conversationId === id).at(-1)!;
    expect(last.senderId).toBe(v.ownerId);
    expect(last.ai).toBe(true);
    expect(last.offerIds).toEqual([offer.id]);
  });

  it("goes quiet once the vendor writes by hand, and when turned off", async () => {
    const { v, id, owner } = await chatWithFirstVendor();
    expect(assistantActive(getDB(), { id, vendorId: v.id })).toBe(true);
    await asActor(owner, () => sendMessage(id, "Здравствуйте, это Айбек, отвечу сам"));
    expect(assistantActive(getDB(), { id, vendorId: v.id })).toBe(false);
    await expect(asActor(client, () => postAssistantReply(id, "…"))).rejects.toThrow();

    const other = await chatWithFirstVendor();
    await asActor(other.owner, () => updateVendor(other.v.id, { aiAssistant: false }));
    expect(assistantActive(getDB(), { id: "c-none", vendorId: other.v.id })).toBe(false);
  });

  it("only the chat's client can trigger it", async () => {
    const { id } = await chatWithFirstVendor();
    await expect(asActor({ id: "u-client-2", role: "client" }, () => postAssistantReply(id, "hi"))).rejects.toThrow();
  });

  it("builds a valid request with prices and busy dates; none before the client writes", async () => {
    const { id } = await chatWithFirstVendor();
    expect(selectAssistantRequest(getDB(), client, id, "ru")).toBeNull();
    await asActor(client, () => sendMessage(id, "Свободны 2027-06-14?"));
    const req = selectAssistantRequest(getDB(), client, id, "ru")!;
    expect(vendorChatRequestSchema.safeParse(req).success).toBe(true);
    expect(req.vendor.offers[0].price).toBeGreaterThan(0);
    expect(req.history.at(-1)).toEqual({ from: "client", text: "Свободны 2027-06-14?" });
    const reply = mockVendorReply(req);
    expect(reply.text.length).toBeGreaterThan(10);
  });

  it("cuts booking markers out of the model text and keeps only real offers", () => {
    const r = parseBookingMarkers("Могу закрепить дату.\n[[book:o-1]]\n[[book:o-x]]", ["o-1"]);
    expect(r).toEqual({ text: "Могу закрепить дату.", offerIds: ["o-1"] });
  });
});
