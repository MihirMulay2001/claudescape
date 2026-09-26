import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.RABBIT_HOLE_MODEL ?? "claude-haiku-4-5";
const MAX_PROMPT_CHARS = 40_000;

const SYSTEM = `You are the editor of "claudescape", a magazine that writes one feature page per topic for a curious reader who keeps falling deeper. Voice: vivid, concrete, witty, confident: a great magazine feature, never an encyclopedia entry. Use real names, places, dates and numbers, and stay accurate. Respond with ONLY one valid JSON object: no markdown fences, no commentary.`;

const client = new Anthropic();

export async function POST(request: Request) {
  let body: { prompt?: unknown; maxTokens?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { prompt, maxTokens } = body;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT_CHARS) {
    return Response.json({ error: "Invalid prompt." }, { status: 400 });
  }
  const max = Math.min(4096, Math.max(256, Number(maxTokens) || 2048));

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: max,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") {
      return Response.json({ error: "The model declined to write this page." }, { status: 422 });
    }
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return Response.json({ text });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "Missing or invalid ANTHROPIC_API_KEY on the server." }, { status: 500 });
    }
    if (e instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Rate limited — try again in a moment." }, { status: 429 });
    }
    if (e instanceof Anthropic.APIError) {
      return Response.json({ error: e.message }, { status: 502 });
    }
    const message = e instanceof Error ? e.message : String(e);
    if (/authentication method/i.test(message)) {
      return Response.json({ error: "No ANTHROPIC_API_KEY set — add it to .env.local and restart the dev server." }, { status: 500 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
