/**
 * Calls the Groq API (groq.com — not to be confused with xAI's Grok) to turn
 * a raw transcript into structured content: Title, hook, Summary, exactly 10
 * Key Takeaways, the single best quote, and topic tags (from the fixed list
 * in lib/topics.ts — see knowledge/decisions/0004-fixed-topic-list.md).
 *
 * Cost: $0. Groq's free tier requires no credit card — 30 requests/minute,
 * 14,400 requests/day. We make one call per episode, nowhere close to that
 * limit. Uses GPT-OSS 120B (OpenAI's open-weight model, served by Groq),
 * a solid model for this kind of structured extraction task.
 *
 * Note: Groq periodically retires older model IDs (e.g. llama-3.3-70b-versatile
 * was decommissioned in August 2026). If this starts 404ing again in the
 * future, check https://console.groq.com/docs/models for the current
 * production model list and swap the model string below.
 */

import { TOPICS, cleanTopics, Topic } from "./topics";
import { groqChat, stripFences } from "./groqClient";
import { LENNY_SUMMARY_RULES, CURIOSITY_RULES } from "./styleGuide";

interface ResourceMention {
  label: string; // e.g. "Acme Corp" or "The Lean Startup by Eric Ries"
  type: string; // "person" | "company" | "book" | "tool" | "other"
}

interface ExtractedContent {
  title: string;
  hook: string;
  summary: string;
  takeaways: string[]; // always exactly 10
  bestQuote: string;
  guestTitle: string;
  resources: ResourceMention[]; // named things mentioned that likely need a link
  topics: Topic[]; // 1–3 episode topics, fixed list only
  takeawayTopics: (Topic | null)[]; // one topic per takeaway (same order), or null
}

// Groq's free tier caps total tokens-per-minute at 8,000 (shared across
// input + output, across the whole account, not just this one model).
// A full episode transcript alone can easily exceed that on its own, so we
// truncate to a safe budget rather than let the request fail outright.
// ~4 characters per token is a reasonable rule of thumb for English text.
const MAX_TRANSCRIPT_CHARS = 23000; // ~6,000 tokens, leaving room for the
// prompt instructions (~400 tokens) and the model's response (~1,500 tokens)
// within the 8,000 TPM budget. This is close to the real ceiling — pushing
// much higher risks the same 413 error, since Groq's free tier counts
// input + output together, per minute, across the whole account.

/**
 * Notes for one part of a long transcript (decision 0019). Compact, but keeps verbatim quotes,
 * names, numbers and resources so the final draft can use the WHOLE conversation.
 */
export async function digestPart(part: string, index: number, total: number, guestName: string, hostName: string): Promise<string> {
  const prompt = `This is part ${index + 1} of ${total} of a Profit Streams® Podcast transcript. Host: ${hostName}. Guest: ${guestName}.
Write compact notes on THIS part only, as plain text with these headings:
IDEAS: 4 to 8 bullets, each one specific idea, claim, story or framework from this part (include numbers, company names, results).
QUOTES: 2 to 4 short lines the GUEST said, copied word for word (you may drop "um"), each under 200 characters, in quotes.
RESOURCES: every named book (with author), company, tool, framework, article or person mentioned (not host/guest), comma separated, or "none".
GUEST FACTS: anything about the guest's role, background, companies, books or results, or "none".
Under 350 words total. Never invent anything. Never use em-dashes.

Transcript part ${index + 1}/${total}:
${part}`;
  return (await groqChat({ prompt, maxTokens: 1100, temperature: 0.2, retryMaxTokens: 1400 })).trim();
}

export async function extractEpisodeContent(
  transcript: string,
  guestName: string,
  hostName: string,
  digest?: string
): Promise<ExtractedContent & { truncated: boolean }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY environment variable.");
  }

  // With notes from every part (long episodes), nothing is truncated.
  const useDigest = !!(digest && digest.trim());
  const truncated = !useDigest && transcript.length > MAX_TRANSCRIPT_CHARS;
  const transcriptForPrompt = useDigest
    ? `[Notes covering the WHOLE conversation, written part by part. Quotes in them are verbatim.]\n\n${digest!.slice(0, 16000)}`
    : truncated
    ? transcript.slice(0, MAX_TRANSCRIPT_CHARS) +
      "\n\n[Transcript truncated here due to free-tier token limits — the rest of the conversation was not analyzed.]"
    : transcript;

  const prompt = `You are producing show notes for the Profit Streams® Podcast, hosted by ${hostName}. The guest this episode is ${guestName}.

Below is the conversation (either the full transcript, or notes covering all of it). Extract the following, and respond with ONLY valid JSON, no other text, no markdown code fences, no explanation before or after:

{
  "title": "A punchy episode title, under 60 characters, that makes people curious (a tension, surprising claim or specific result from the episode, not generic)",
  "hook": "One sentence, under 25 words, that opens a curiosity loop: the single most surprising or counterintuitive idea from the episode",
  "summary": "Lenny-style episode summary (rules below)",
  "takeaways": ["exactly 10 key takeaways, each a complete sentence (under 30 words) capturing a distinct idea, ordered by how they appear in the conversation. In each one, wrap the 2 to 4 most important words in **double asterisks**"],
  "bestQuote": "The single most quotable, self-contained line from the guest, copied exactly (from the transcript or from the QUOTES in the notes), under 200 characters",
  "guestTitle": "A short professional title/role for the guest, inferred from how they're introduced or what they discuss (e.g. 'Strategic Portfolio Management Expert')",
  "resources": [
    {"label": "Every specific named person, company, book, product, or tool mentioned in the conversation that a listener might want to look up — for example a book title with its author, a named company, a named software product, another podcast, an article, or a person other than the host/guest themselves. Do NOT include the host or guest's own name here. Do NOT invent a URL — just identify what should be linked.", "type": "person | company | book | tool | other"}
  ],
  "topics": ["1 to 3 topics this episode is MOST about, chosen ONLY from the allowed topic list below"],
  "takeawayTopics": ["exactly 10 entries, one per takeaway in the same order: the single best topic for that takeaway, chosen ONLY from the allowed topic list below"]
}

Summary rules:
${LENNY_SUMMARY_RULES}

Title and hook rules: ${CURIOSITY_RULES}

Never use em-dashes or en-dashes.

Allowed topic list (use these exact words, nothing else): ${TOPICS.join(" | ")}

Important: "Profit Streams" must always be written as "Profit Streams®" with the registered trademark symbol, in the title, hook, and summary fields.

For "resources": be thorough — include anything a real listener would plausibly want a link for, even minor mentions. It is fine if this list is empty for a sparse conversation, and fine if it has 10+ entries for a reference-heavy one. Never fabricate a URL — that step happens separately by a human.

Transcript:
${transcriptForPrompt}`;

  // retryMaxTokens stays at 1600: transcript + answer must fit Groq's 8,000 tokens/minute
  const rawText = await groqChat({ prompt, maxTokens: 1600, temperature: 0.4, retryMaxTokens: 1600 });
  let parsed: any;
  try {
    parsed = JSON.parse(stripFences(rawText));
  } catch {
    throw new Error("The AI's answer wasn't readable — please click Generate again.");
  }

  if (!Array.isArray(parsed.takeaways) || parsed.takeaways.length !== 10) {
    throw new Error(
      `Expected exactly 10 takeaways, got ${parsed.takeaways?.length ?? 0}. Response may need manual review.`
    );
  }

  // Resources are best-effort — default to an empty list rather than fail
  // the whole generation if the model omits this field.
  if (!Array.isArray(parsed.resources)) {
    parsed.resources = [];
  }

  // Topics are best-effort too: anything outside the fixed list is dropped,
  // and a bad/missing answer never fails the whole kit.
  parsed.topics = cleanTopics(parsed.topics).slice(0, 3);
  const perTakeaway = Array.isArray(parsed.takeawayTopics) ? parsed.takeawayTopics : [];
  parsed.takeawayTopics = parsed.takeaways.map((_: string, i: number) => cleanTopics([perTakeaway[i]])[0] || null);

  return { ...parsed, truncated };
}
