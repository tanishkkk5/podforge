import { fixBrand } from "../showNotes";
import { GroqRateLimitError } from "../topicTagger";

/**
 * Prep Brief Writer (knowledge/skills/prep-brief-writer.md).
 * One job: draft a short pre-recording brief for the host from the guest's own
 * intake answers and a list of past episodes. It must not invent facts about
 * the guest. A person reviews it before the host sees it.
 */
export interface BriefIntake {
  full_name: string;
  role?: string | null;
  company?: string | null;
  short_bio?: string | null;
  long_bio?: string | null;
  linkedin?: string | null;
  books?: { title?: string }[] | null;
  resources?: string | null;
  topics?: string | null;
}
export interface PastEpisode {
  title: string;
  guest_name: string | null;
  episode_label: string | null;
  summary: string | null;
  topics: string[];
}

const clip = (s: string | null | undefined, n: number) => (s || "").trim().slice(0, n);

export async function draftPrepBrief(
  intake: BriefIntake,
  hostName: string,
  past: PastEpisode[]
): Promise<{ title: string; content: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY environment variable.");

  const books = (intake.books || []).map((b) => b.title).filter(Boolean).join("; ");
  const catalog = past
    .slice(0, 40)
    .map((p) => `- ${[p.episode_label, p.title].filter(Boolean).join(" · ")}${p.guest_name ? ` (with ${p.guest_name})` : ""}: ${clip(p.summary, 160)} [${p.topics.join(", ")}]`)
    .join("\n");

  const prompt = `You are preparing ${hostName}, host of the Profit Streams® Podcast (business, pricing, product and portfolio leadership), for a recording with ${intake.full_name}.

Use ONLY the facts below. Never invent achievements, numbers, employers or opinions. If something isn't in the material, don't say it.

GUEST'S OWN INTAKE ANSWERS
Name: ${intake.full_name}
Title / role: ${clip(intake.role, 200)}
Company: ${clip(intake.company, 200)}
Short bio: ${clip(intake.short_bio, 800)}
Long bio: ${clip(intake.long_bio, 2500)}
Books they've written or recommend: ${clip(books, 500)}
Resources they mentioned: ${clip(intake.resources, 600)}
Topics they'd like to cover: ${clip(intake.topics, 800)}

PAST EPISODES (to avoid repeating and to cross-reference)
${catalog || "(none yet)"}

Write a brief in plain text with exactly these sections:
1. "Who they are" — 2–3 sentences.
2. "Why they fit the show" — 1–2 sentences.
3. "Suggested questions" — 8 numbered questions, specific to this guest, that don't repeat what past episodes already covered.
4. "Related past episodes" — up to 3 from the list above, one line each saying why it's related. Write "None" if nothing fits.
5. "Worth mentioning" — their books/resources from the intake, if any.
Keep it under 450 words. Always write "Profit Streams®".`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      max_tokens: 1400,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (res.status === 429) throw new GroqRateLimitError("Groq free-tier limit reached — wait about a minute and try again.");
  if (!res.ok) throw new Error(`Groq API error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const text = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("The AI returned an empty brief — try again.");
  return { title: `Prep brief: ${intake.full_name} (for ${hostName})`, content: fixBrand(text) };
}
