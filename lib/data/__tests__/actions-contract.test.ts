import { beforeEach, describe, expect, it } from "vitest";
import * as actions from "../actions";
import { AvailabilityError } from "../actions/bookings";
import { PolicyError } from "../policies";
import { buildSeed } from "../seed";
import { useDataStore } from "../store";
import { actionErrorMessage } from "../use-action";

/** Helpers that live next to the actions but are not writes */
const NOT_ACTIONS = new Set(["asActor", "currentActor", "AvailabilityError"]);

describe("action contract", () => {
  beforeEach(() => useDataStore.setState({ db: buildSeed(), hydrated: true }));

  it("every exported action is async, so callers don't change when it becomes a network call", () => {
    const sync = Object.entries(actions)
      .filter(([name, fn]) => typeof fn === "function" && !NOT_ACTIONS.has(name))
      .filter(([, fn]) => fn.constructor.name !== "AsyncFunction")
      .map(([name]) => name);
    expect(sync).toEqual([]);
  });

  it("a denied action rejects instead of throwing synchronously", async () => {
    let promise: Promise<unknown> | undefined;
    expect(() => {
      promise = actions.asActor({ id: "u-admin", role: "admin" }, () => actions.toggleFavorite("v-x"));
    }).not.toThrow();
    await expect(promise).rejects.toBeInstanceOf(PolicyError);
  });

  it("maps errors to user-facing text", () => {
    const t = ((key: string, vars?: Record<string, unknown>) => (vars ? `${key}:${JSON.stringify(vars)}` : key)) as never;
    expect(actionErrorMessage(new PolicyError("x"), t)).toBe("common.forbidden");
    expect(actionErrorMessage(new AvailabilityError(2), t)).toBe('common.unavailable:{"n":2}');
    expect(actionErrorMessage(new Error("boom"), t)).toBe("common.actionFailed");
  });
});
