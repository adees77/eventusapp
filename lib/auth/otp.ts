/**
 * One-time email codes. Pure functions so the rules are easy to test.
 * In the demo the code is generated in the browser and shown on screen;
 * with a real backend `createCode` moves to the server and the code is emailed.
 */
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60_000;
export const OTP_RESEND_MS = 30_000;
export const OTP_MAX_ATTEMPTS = 5;

export interface PendingCode {
  email: string;
  code: string;
  sentAt: number;
  expiresAt: number;
  attempts: number;
}

export type VerifyResult = "ok" | "wrong" | "expired" | "locked" | "none";

export function createCode(email: string, now = Date.now(), random = Math.random): PendingCode {
  const code = String(Math.floor(random() * 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
  return { email: email.trim().toLowerCase(), code, sentAt: now, expiresAt: now + OTP_TTL_MS, attempts: 0 };
}

export function checkCode(
  pending: PendingCode | null,
  input: string,
  now = Date.now(),
): { result: VerifyResult; pending: PendingCode | null } {
  if (!pending) return { result: "none", pending };
  if (pending.attempts >= OTP_MAX_ATTEMPTS) return { result: "locked", pending };
  if (now > pending.expiresAt) return { result: "expired", pending };
  const clean = input.replace(/\D/g, "");
  if (clean === pending.code) return { result: "ok", pending: null };
  const next = { ...pending, attempts: pending.attempts + 1 };
  return { result: next.attempts >= OTP_MAX_ATTEMPTS ? "locked" : "wrong", pending: next };
}

export function resendIn(pending: PendingCode | null, now = Date.now()): number {
  if (!pending) return 0;
  return Math.max(0, Math.ceil((pending.sentAt + OTP_RESEND_MS - now) / 1000));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (s: string) => EMAIL_RE.test(s.trim());

/** "aigerim.kasymova@gmail.com" → "Aigerim Kasymova" — a friendly first guess for the name */
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .replace(/[0-9]+/g, " ")
    .split(/[._\-+\s]+/)
    .filter((p) => p.length > 1)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}
