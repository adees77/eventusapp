import { createHash, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/login {password} — the hidden admin entrance (/admin/admin). The password is checked
 * here, on the server, against a SHA-256 hash: never in the browser bundle. Change it by setting
 * ADMIN_PANEL_PASSWORD_SHA256 (hex) in the environment; the fallback below is the starting password.
 * Until stage 4 the admin panel works on this browser's data; real access control then comes from RLS.
 */
const FALLBACK_SHA256 = "babfd87b4501e49cac80ff8f1134044e5c61dd44950d679d829d8084a126a4c2";

export async function POST(req: Request) {
  let password = "";
  try {
    password = String(((await req.json()) as { password?: unknown }).password ?? "");
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const expected = Buffer.from(process.env.ADMIN_PANEL_PASSWORD_SHA256 || FALLBACK_SHA256, "hex");
  const given = createHash("sha256").update(password).digest();
  // a pause on every attempt makes guessing slow
  await new Promise((r) => setTimeout(r, 600));
  const ok = expected.length === given.length && timingSafeEqual(expected, given);
  return Response.json({ ok }, { status: ok ? 200 : 401 });
}
