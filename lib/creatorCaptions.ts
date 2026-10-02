import { fixBrand } from "./showNotes";
import { GroqRateLimitError } from "./topicTagger";

export interface CaptionInput {
  id: string;
  title: string;
  guest_name: string | null;
  summary: string | null;
  excerpt: string;
}

export interface Captions {
  linkedin: string;
  instagram: string;
}

const DEFAULT_LISTEN = "https://profit-streams.com/profit-streams-podcast";

/** Credit line is added in code (never left to the AI), so it's always there. */
export function withCredit(c: Captions, guest: string | null, listenUrl?: string): Captions {
  const url = (listenUrl || DEFAULT_LISTEN).trim();
  const who = guest ? ` with ${guest}` : "";
  return {
    linkedin: fixBrand(`${c.linkedin.trim()}\n\n🎧 From the Profit Streams® Podcast${who}, hosted by Luke Hohmann: ${url}\n\n#ProfitStreamsPodcast`),
    instagram: fixBrand(`${c.instagram.trim()}\n\n🎧 From the Profit Streams® Podcast${who} — full episode at ${url.replace(/^https?:\/\//, "")}\n.\n.\n.\n#ProfitStreamsPodcast #Podcast`),
  };
}

function fallback(item: CaptionInput): Captions {
  const line = item.summary || item.title;
  return { linkedin: line, instagram: `${line} 🎧` };
}

/**
 * Writes captions for each clip, tailored to the creator's niche, in ONE
 * Groq call (free tier). If the AI fails, simple template captions are used
 * so a kit can always be made.
 */
export async function writeCreatorCaptions(
  creatorName: string,
  niche: string[],
  items: CaptionInput[]
): Promise<{ captions: Record<string, Captions>; usedFallback: boolean }> {
  const apiKey = process.env.GROQ_API_KEY;
  const fallbackAll = () =>
    Object.fromEntries(items.map((i) => [i.id, fallback(i)])) as Record<string, Captions>;
  if (!apiKey) return { captions: fallbackAll(), usedFallback: true };

  const prompt = `You write social captions that the creator "${creatorName}" could post to share clips from the Profit Streams® Podcast with THEIR audience, whose interests are: ${niche.join(", ") || "business and product leadership"}.

For each clip write:
- "linkedin": 2–4 short sentences in a thoughtful first-person voice the creator could post as-is. Lead with the insight that matters most to their audience. No hashtags, no links.
- "instagram": 1–2 punchy sentences, one or two emojis max. No hashtags, no links.
Never invent facts beyond the clip. Always write "Profit Streams" as "Profit Streams®".

Respond with ONLY JSON: {"items": [{"id": "...", "linkedin": "...", "instagram": "..."}]}

Clips:
${items
  .map(
    (i) => `---
id: ${i.id}
title: ${i.title}
guest: ${i.guest_name || "unknown"}
summary: ${i.summary || ""}
excerpt: ${i.excerpt}`
  )
  .join("\n")}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      max_tokens: 1800,
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (res.status === 429) throw new GroqRateLimitError("Groq free-tier limit reached — wait about a minute and try again.");
  if (!res.ok) return { captions: fallbackAll(), usedFallback: true };

  try {
    const data = await res.json();
    const parsed = JSON.parse(String(data?.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim());
    const out = fallbackAll();
    let usedFallback = false;
    const got = new Map<string, any>((parsed.items || []).map((x: any) => [String(x.id), x]));
    for (const i of items) {
      const x = got.get(i.id);
      if (x && typeof x.linkedin === "string" && typeof x.instagram === "string" && x.linkedin.trim()) {
        out[i.id] = { linkedin: x.linkedin, instagram: x.instagram };
      } else usedFallback = true;
    }
    return { captions: out, usedFallback };
  } catch {
    return { captions: fallbackAll(), usedFallback: true };
  }
}
