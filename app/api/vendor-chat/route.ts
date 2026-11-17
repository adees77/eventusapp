import { vendorReply } from "@/lib/ai/vendor-agent";
import { mockVendorReply } from "@/lib/ai/vendor-mock";
import { vendorChatRequestSchema, type VendorChatReply } from "@/lib/ai/vendor-protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/vendor-chat — one answer of a vendor's AI assistant in the client ↔
 * vendor chat. Same provider order as /api/chat (DeepSeek → Claude → scripted).
 * If the provider fails, the scripted assistant answers so the client is never left hanging.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = vendorChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  try {
    return Response.json(await vendorReply(parsed.data));
  } catch (err) {
    console.error("[vendor-chat]", err);
    const fallback: VendorChatReply = { ...mockVendorReply(parsed.data), mode: "mock" };
    return Response.json(fallback);
  }
}
