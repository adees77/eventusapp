import { describe, expect, it } from "vitest";
import { OTP_MAX_ATTEMPTS, OTP_TTL_MS, checkCode, createCode, isEmail, nameFromEmail, resendIn } from "../auth/otp";

describe("email codes", () => {
  const t0 = 1_000_000;
  const pending = createCode(" Aigerim@Gmail.com ", t0, () => 0.0123);

  it("creates a 6-digit code for a normalised email", () => {
    expect(pending.code).toBe("012300");
    expect(pending.email).toBe("aigerim@gmail.com");
  });

  it("accepts the right code and clears it", () => {
    expect(checkCode(pending, "012 300", t0 + 1000)).toEqual({ result: "ok", pending: null });
  });

  it("counts wrong attempts and locks", () => {
    let p = pending;
    for (let i = 1; i < OTP_MAX_ATTEMPTS; i++) {
      const r = checkCode(p, "999999", t0);
      expect(r.result).toBe("wrong");
      p = r.pending!;
    }
    expect(checkCode(p, "999999", t0).result).toBe("locked");
    expect(checkCode({ ...p, attempts: OTP_MAX_ATTEMPTS }, pending.code, t0).result).toBe("locked");
  });

  it("expires", () => {
    expect(checkCode(pending, pending.code, t0 + OTP_TTL_MS + 1).result).toBe("expired");
    expect(checkCode(null, "1").result).toBe("none");
  });

  it("throttles resend for 30 seconds", () => {
    expect(resendIn(pending, t0 + 10_000)).toBe(20);
    expect(resendIn(pending, t0 + 31_000)).toBe(0);
  });

  it("validates emails and guesses names", () => {
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("a@b")).toBe(false);
    expect(nameFromEmail("aigerim.kasymova92@gmail.com")).toBe("Aigerim Kasymova");
  });
});
