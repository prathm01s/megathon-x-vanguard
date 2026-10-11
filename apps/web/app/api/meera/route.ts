// "Ask Meera": the in-game money tutor, answered by Claude with the student's game session as
// context. Streams plain text back. Needs ANTHROPIC_API_KEY on the server (never the browser).
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Fixed instructions: identical on every request so they are served from the prompt cache.
const SYSTEM = `You are Meera, the friendly guide inside Toss Life, a game that teaches money skills to students aged about 15 to 18 in India, many from low-income communities. The student has just played a chapter of the game, or is looking back at one in the Time Machine. Their game session is given to you below.

How to answer:
- Use simple words a 15-year-old understands. Explain any money term the first time you use it, in one short phrase.
- Base answers on the student's actual session: mention their real choices, years, amounts and events from the session data. Never invent events or numbers that are not in it. If the session doesn't show something, say so.
- Be warm and encouraging. Point out what went well before what could be better. Never shame or scold.
- Keep it short: 2 to 5 sentences, or up to 4 short bullet points. Stay under 120 words unless the student asks for more detail. No headings.
- Reply in the student's language (the language code is given with the session; "te" means Telugu, "hi" Hindi, "ur" Urdu, "en" English).

Rules you always follow:
- Educate, never recommend. Never name real banks, mutual funds, brokers, apps, companies or products. Only use the game's own fictional names (for example "Big Bank Savings Account" or "Sunrise Equity Fund"). Never tell the student what to do with their real money; explain the trade-offs instead.
- Game returns are assumptions based on past patterns, not promises. Say so when you talk about returns.
- Stay on topic: the game, budgeting, saving, investing, loans, insurance and staying safe from scams. If asked about something else, kindly bring the talk back to money skills.
- Never ask for personal details (real name, phone number, address, school, family income, passwords or OTPs).
- If the student mentions a real-life problem such as real debt, harassment by a loan app, a scam that took real money, or feeling unsafe, respond kindly, tell them to talk to a trusted adult or their NGO facilitator, and for real scams mention India's national cybercrime helpline 1930. Do not try to solve the real-life problem yourself.`;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(30),
  context: z.string().max(30000),
  locale: z.enum(["en", "te", "hi", "ur"]).default("en"),
});

// Small per-user limit (per server instance): 20 questions per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 20;
const recent = new Map<string, number[]>();
function allow(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= LIMIT) return false;
  hits.push(now);
  recent.set(key, hits);
  return true;
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  // Only signed-in students (when accounts are on); the mock mode has a single local player.
  let userKey = "local";
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
    userKey = user.id;
  }
  if (!allow(userKey)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const { messages, context, locale } = parsed.data;
  if (messages[0]?.role !== "user") return Response.json({ error: "bad_request" }, { status: 400 });

  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    // If a safety classifier declines, Anthropic retries on its recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    // Short tutoring answers: low effort keeps replies quick.
    output_config: { effort: "low" },
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
      {
        type: "text",
        text: `Student's language code: ${locale}\n\nThe student's game session:\n${context}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(
            encoder.encode("I can't help with that one. Ask me about your game or money skills!"),
          );
        }
      } catch (err) {
        console.error("Meera chat failed:", err instanceof Anthropic.APIError ? err.status : err);
        controller.enqueue(
          encoder.encode(
            err instanceof Anthropic.RateLimitError
              ? "Lots of students are asking right now. Try again in a minute!"
              : "Sorry, I couldn't answer just now. Please try again.",
          ),
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
