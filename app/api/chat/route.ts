import { streamClaudeTurn } from "@/lib/ai/claude-agent";
import { streamMockTurn } from "@/lib/ai/mock-agent";
import { chatRequestSchema, sse, type ChatEvent, type ChatRequest } from "@/lib/ai/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/chat — one assistant turn as Server-Sent Events.
 * Uses Claude when ANTHROPIC_API_KEY is set on the server, otherwise the
 * scripted demo agent. The key never leaves the server.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }
  const { messages, context } = parsed.data as unknown as ChatRequest;
  const mode = process.env.ANTHROPIC_API_KEY ? "claude" : "mock";
  const turn: AsyncGenerator<ChatEvent> = mode === "claude" ? streamClaudeTurn(messages, context) : streamMockTurn(messages, context);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of turn) {
          if (req.signal.aborted) break;
          controller.enqueue(encoder.encode(sse(event)));
        }
      } catch (err) {
        console.error("[chat]", err);
        controller.enqueue(encoder.encode(sse({ type: "error", message: "server" })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Eventus-Mode": mode,
    },
  });
}
