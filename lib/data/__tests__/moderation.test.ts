import { beforeEach, describe, expect, it } from "vitest";
import {
  decideVerification,
  missingDocs,
  reportContent,
  requestVerification,
  resolveComplaint,
  reviewDocument,
  uploadDocument,
} from "../actions";
import type { Actor } from "../policies";
import { buildSeed } from "../seed";
import { getDB, migrate, useDataStore } from "../store";

const admin: Actor = { id: "u-admin", role: "admin" };
const clients: Actor[] = ["u-client", "u-client-2", "u-client-3"].map((id) => ({ id, role: "client" }));

describe("verification", () => {
  beforeEach(() => useDataStore.setState({ db: buildSeed(), hydrated: true }));

  it("seed has a pending queue and approved papers for verified vendors", () => {
    const db = getDB();
    expect(db.vendors.some((v) => v.verification?.state === "pending")).toBe(true);
    const verified = db.vendors.find((v) => v.verified)!;
    expect(db.documents.filter((d) => d.vendorId === verified.id && d.status === "approved").length).toBe(2);
  });

  it("a vendor sends papers, admin approves, the badge appears", () => {
    const v = getDB().vendors.find((x) => !x.verified && !x.verification)!;
    const owner: Actor = { id: v.ownerId, role: "vendor" };
    expect(() => requestVerification(owner, v.id)).toThrow();
    uploadDocument(owner, v.id, "passport", "p.pdf");
    uploadDocument(owner, v.id, "registration", "r.pdf");
    expect(missingDocs(getDB(), v.id)).toEqual([]);
    requestVerification(owner, v.id);
    expect(getDB().vendors.find((x) => x.id === v.id)?.verification?.state).toBe("pending");
    expect(() => decideVerification(owner, v.id, true)).toThrow();
    decideVerification(admin, v.id, true);
    const after = getDB().vendors.find((x) => x.id === v.id)!;
    expect(after.verified).toBe(true);
    expect(after.verification).toBeUndefined();
    expect(getDB().documents.filter((d) => d.vendorId === v.id).every((d) => d.status === "approved")).toBe(true);
  });

  it("a rejected document blocks the request until replaced", () => {
    const v = getDB().vendors.find((x) => !x.verified && !x.verification)!;
    const owner: Actor = { id: v.ownerId, role: "vendor" };
    uploadDocument(owner, v.id, "passport", "p.pdf");
    uploadDocument(owner, v.id, "registration", "r.pdf");
    const reg = getDB().documents.find((d) => d.vendorId === v.id && d.kind === "registration")!;
    reviewDocument(admin, reg.id, "rejected", "blurry");
    expect(missingDocs(getDB(), v.id)).toEqual(["registration"]);
  });

  it("old saved demos get documents, complaints and new settings", () => {
    const db = buildSeed();
    const old = { ...db, documents: undefined, complaints: undefined, settings: { feePercent: 7, defaultPrepayPercent: 30, autoReleaseDays: 3 } };
    const m = migrate(old as never);
    expect(m.documents.length).toBeGreaterThan(0);
    expect(m.complaints.length).toBeGreaterThan(0);
    expect(m.settings.requiredDocs).toEqual(["passport", "registration"]);
    expect(m.settings.feePercent).toBe(7);
  });
});

describe("complaints", () => {
  beforeEach(() => useDataStore.setState({ db: buildSeed(), hydrated: true }));

  it("a post is hidden after the configured number of reports and admin can restore it", () => {
    const post = getDB().posts.find((p) => !getDB().complaints.some((c) => c.targetId === p.id))!;
    expect(getDB().settings.autoHideComplaints).toBe(3);
    reportContent(clients[0], "post", post.id, "spam");
    expect(reportContent(clients[0], "post", post.id, "spam")).toBe(false);
    reportContent(clients[1], "post", post.id, "fake");
    expect(getDB().posts.find((p) => p.id === post.id)?.hidden).toBeFalsy();
    reportContent(clients[2], "post", post.id, "offensive");
    expect(getDB().posts.find((p) => p.id === post.id)?.hidden).toBe(true);
    const c = getDB().complaints.find((x) => x.targetId === post.id)!;
    resolveComplaint(admin, c.id, false);
    expect(getDB().posts.find((p) => p.id === post.id)?.hidden).toBe(false);
    expect(getDB().complaints.filter((x) => x.targetId === post.id).every((x) => x.status === "dismissed")).toBe(true);
  });

  it("a vendor cannot report own content and admin cannot report", () => {
    const post = getDB().posts[0];
    const owner = getDB().vendors.find((v) => v.id === post.vendorId)!.ownerId;
    expect(() => reportContent({ id: owner, role: "vendor" }, "post", post.id, "spam")).toThrow();
    expect(() => reportContent(admin, "post", post.id, "spam")).toThrow();
  });
});
