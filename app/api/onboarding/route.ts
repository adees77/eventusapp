import { z } from "zod";
import { extractOnboardingFields } from "@/lib/ai/onboarding-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  step: z.string().max(32),
  text: z.string().min(1).max(1000),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * POST /api/onboarding — structured extraction for one onboarding answer.
 * `{ fields: null }` means "no AI configured or nothing found"; the chat then
 * asks again with a hint. Keys stay on the server.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { step, text, today } = parsed.data;
  try {
    const timeout = AbortSignal.timeout(8000);
    const { mode, fields } = await extractOnboardingFields(step, text, today, AbortSignal.any([req.signal, timeout]));
    return Response.json({ mode, fields });
  } catch (err) {
    console.error("[onboarding]", err);
    return Response.json({ mode: "error", fields: null });
  }
}
