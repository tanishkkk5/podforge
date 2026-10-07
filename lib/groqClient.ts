/**
 * The one place Podforge talks to Groq (free tier, decisions 0001/0002).
 *
 * Why this exists: openai/gpt-oss-120b "thinks" before it answers, and that
 * thinking counts against max_tokens. With a small budget it can think the
 * whole budget away and return an EMPTY answer — Groq then rejects JSON mode
 * with "json_validate_failed" (seen live on the Outreach Drafter, Oct 2026).
 * So every call here:
 *   1. asks for short thinking (reasoning_effort: "low") — faster, cheaper
 *   2. retries ONCE with a bigger budget if the answer is empty / invalid JSON
 *   3. drops reasoning_effort automatically if Groq ever rejects it
 *   4. turns 429s into GroqRateLimitError so pages can wait and retry
 */
export class GroqRateLimitError extends Error {}

const MODEL = "openai/gpt-oss-120b";
const URL = "https://api.groq.com/openai/v1/chat/completions";
let reasoningSupported = true; // flips off if Groq rejects the parameter

export interface GroqOptions {
  prompt: string;
  maxTokens: number;
  temperature?: number;
  json?: boolean;            // ask for a JSON object (response_format)
  retryMaxTokens?: number;   // budget for the one retry (default: double, max 3000)
}

async function once(o: GroqOptions, maxTokens: number): Promise<{ ok: boolean; status: number; text: string; content: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY environment variable.");
  const body: Record<string, any> = {
    model: MODEL,
    max_tokens: maxTokens,
    temperature: o.temperature ?? 0.4,
    messages: [{ role: "user", content: o.prompt }],
  };
  if (reasoningSupported) body.reasoning_effort = "low";
  if (o.json) body.response_format = { type: "json_object" };
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let content = "";
  if (res.ok) {
    try {
      content = String(JSON.parse(text)?.choices?.[0]?.message?.content || "");
    } catch {
      content = "";
    }
  }
  return { ok: res.ok, status: res.status, text, content };
}

const looksEmptyOrBadJson = (r: { ok: boolean; text: string; content: string }, json?: boolean) =>
  (!r.ok && /json_validate_failed|failed to validate json/i.test(r.text)) ||
  (r.ok && !r.content.trim()) ||
  (r.ok && json && !isJson(r.content));

function isJson(s: string): boolean {
  try {
    JSON.parse(stripFences(s));
    return true;
  } catch {
    return false;
  }
}

export function stripFences(s: string): string {
  const t = (s || "").replace(/```json|```/g, "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  return m ? m[0] : t;
}

/** Returns the model's text answer (never empty — throws instead). */
export async function groqChat(o: GroqOptions): Promise<string> {
  let r = await once(o, o.maxTokens);

  // Groq rejected the reasoning_effort parameter → remember and retry without it
  if (!r.ok && r.status === 400 && /reasoning_effort/i.test(r.text)) {
    reasoningSupported = false;
    r = await once(o, o.maxTokens);
  }
  if (r.status === 429) throw new GroqRateLimitError("Groq free-tier limit reached — wait about a minute and try again.");

  // Empty or invalid answer (usually: thinking used the whole budget) → one retry with more room
  if (looksEmptyOrBadJson(r, o.json)) {
    r = await once(o, o.retryMaxTokens ?? Math.min(o.maxTokens * 2, 3000));
    if (r.status === 429) throw new GroqRateLimitError("Groq free-tier limit reached — wait about a minute and try again.");
  }

  if (!r.ok) throw new Error(`Groq API error (${r.status}): ${r.text.slice(0, 500)}`);
  if (!r.content.trim()) throw new Error("The AI returned an empty answer twice — please try again in a minute.");
  return r.content;
}

/** groqChat + JSON parsing. Returns {} if the answer isn't valid JSON. */
export async function groqJson(o: Omit<GroqOptions, "json">): Promise<any> {
  const text = await groqChat({ ...o, json: true });
  try {
    return JSON.parse(stripFences(text));
  } catch {
    return {};
  }
}
