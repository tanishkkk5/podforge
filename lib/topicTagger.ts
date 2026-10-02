import { TOPICS, cleanTopics, Topic } from "./topics";
import { fixBrand } from "./showNotes";

/**
 * Picks 1–3 topics (from the fixed list) + a one-line summary for a
 * transcript, using Groq's free tier (same model as the Guest Kit Generator).
 *
 * Groq's free tier allows ~8,000 tokens/minute TOTAL. To stay inside that,
 * long transcripts are SAMPLED (beginning, middle, end) instead of cut off
 * at the start, so the topics reflect the whole conversation.
 */
const SAMPLE_CHARS = 6000; // per slice; 3 slices ≈ 4,500 tokens

export class GroqRateLimitError extends Error {}

function sampleTranscript(t: string): { text: string; sampled: boolean } {
  const clean = t.replace(/\s+\n/g, "\n").trim();
  if (clean.length <= SAMPLE_CHARS * 3) return { text: clean, sampled: false };
  const mid = Math.floor(clean.length / 2 - SAMPLE_CHARS / 2);
  return {
    sampled: true,
    text: [
      clean.slice(0, SAMPLE_CHARS),
      "[…]",
      clean.slice(mid, mid + SAMPLE_CHARS),
      "[…]",
      clean.slice(-SAMPLE_CHARS),
    ].join("\n"),
  };
}

export async function tagTranscript(
  transcript: string,
  kind: "episode" | "clip"
): Promise<{ topics: Topic[]; summary: string; sampled: boolean }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY environment variable.");

  const { text, sampled } = sampleTranscript(transcript);
  const prompt = `You are tagging a ${kind === "clip" ? "short highlight clip" : "full podcast episode"} from the Profit Streams® Podcast (business, pricing, product and portfolio leadership).

Choose the 1 to 3 topics that this ${kind} is MOST about, ONLY from this exact list:
${TOPICS.map((t) => `- ${t}`).join("\n")}

Also write a one-sentence summary (max 25 words). Always write "Profit Streams" as "Profit Streams®".

Respond with ONLY JSON, no markdown: {"topics": ["..."], "summary": "..."}

Transcript${sampled ? " (sampled: beginning, middle and end)" : ""}:
${text}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      max_tokens: 600,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (res.status === 429) {
    throw new GroqRateLimitError("Groq free-tier limit reached — wait about a minute and retry.");
  }
  if (!res.ok) throw new Error(`Groq API error (${res.status}): ${await res.text()}`);

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "";
  let parsed: any;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    throw new Error("Groq returned something that wasn't valid JSON.");
  }
  const topics = cleanTopics(parsed.topics).slice(0, 3);
  if (topics.length === 0) throw new Error("No valid topics came back from the AI.");
  return { topics, summary: fixBrand(String(parsed.summary || "").trim()).slice(0, 300), sampled };
}
