import { Block, formatTime } from "../captions";
import { fixBrand } from "../showNotes";
import { GroqRateLimitError } from "../topicTagger";

/**
 * Clip Finder (knowledge/skills/clip-finder.md).
 * One job: suggest the best 20–90 second moments to cut as short clips.
 * Safety: the AI only picks BLOCK NUMBERS. Start/end times and the quoted
 * words come from Riverside's own caption file — never from the AI — so no
 * timestamp or quote can be invented.
 */
export interface Clip {
  start: number;
  end: number;
  title: string;
  why: string;
  score: number;
  opening: string;
}

export const MIN_CLIP_SEC = 20;
export const MAX_CLIP_SEC = 90;

/** Turns the AI's picks into real clips, dropping anything invalid. */
export function validatePicks(picks: any[], chunk: Block[]): Clip[] {
  const byId = new Map(chunk.map((b) => [b.id, b]));
  const out: Clip[] = [];
  for (const p of Array.isArray(picks) ? picks : []) {
    const from = byId.get(Number(p?.from));
    const to = byId.get(Number(p?.to));
    if (!from || !to || to.id < from.id) continue;
    const dur = to.end - from.start;
    if (dur < MIN_CLIP_SEC || dur > MAX_CLIP_SEC) continue;
    const words = chunk.filter((b) => b.id >= from.id && b.id <= to.id).map((b) => b.text).join(" ");
    out.push({
      start: from.start,
      end: to.end,
      title: fixBrand(String(p?.title || "Untitled clip")).slice(0, 90),
      why: fixBrand(String(p?.why || "")).slice(0, 220),
      score: Math.min(10, Math.max(1, Number(p?.score) || 5)),
      opening: fixBrand(words.split(/\s+/).slice(0, 18).join(" ")) + "…",
    });
  }
  return out;
}

/** Best clips first, no overlaps. */
export function selectTopClips(all: Clip[], n = 5): Clip[] {
  const chosen: Clip[] = [];
  for (const c of [...all].sort((a, b) => b.score - a.score || a.start - b.start)) {
    if (chosen.some((x) => c.start < x.end && x.start < c.end)) continue;
    chosen.push(c);
    if (chosen.length === n) break;
  }
  return chosen.sort((a, b) => a.start - b.start);
}

export function clipsAsText(clips: Clip[], guest: string): string {
  if (!clips.length) return "No strong clips found in this transcript.";
  return [
    `Suggested clips — ${guest || "episode"} (times from the Riverside captions file)`,
    "",
    ...clips.map((c, i) =>
      `${i + 1}. ${formatTime(c.start)}–${formatTime(c.end)} (${Math.round(c.end - c.start)}s) — ${c.title}\n   Why: ${c.why}\n   Starts with: "${c.opening}"`
    ),
  ].join("\n");
}

export async function findClipsInChunk(chunk: Block[], guest: string): Promise<Clip[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY environment variable.");
  const prompt = `You are a podcast editor for the Profit Streams® Podcast (business, pricing, product and portfolio leadership). Guest: ${guest || "unknown"}.

Below is part of the episode transcript, split into numbered blocks of about 15 seconds.
Pick up to 3 moments that would make great standalone social clips: a clear, surprising or useful idea that makes sense without context, ${MIN_CLIP_SEC}–${MAX_CLIP_SEC} seconds long (so usually 2–6 consecutive blocks). Skip small talk, intros and outros.

Respond with ONLY JSON: {"clips": [{"from": <first block number>, "to": <last block number>, "title": "<short punchy clip title>", "why": "<one sentence: why it works as a clip>", "score": <1-10>}]}
If nothing is strong, return {"clips": []}.

Blocks:
${chunk.map((b) => `[${b.id}] (${formatTime(b.start)}) ${b.text}`).join("\n")}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      max_tokens: 700,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (res.status === 429) throw new GroqRateLimitError("Groq free-tier limit reached — waiting a minute.");
  if (!res.ok) throw new Error(`Groq API error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  let parsed: any;
  try {
    parsed = JSON.parse(String(data?.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim());
  } catch {
    return [];
  }
  return validatePicks(parsed?.clips, chunk);
}
