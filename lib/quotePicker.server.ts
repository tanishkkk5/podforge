/**
 * Picks real quotes (decision 0020): the AI chooses candidate NUMBERS only, never writes a quote.
 * Also writes the optional explainer slide for jargon in the quote (MQ, OKR) or a new technology.
 */
import { groqJson } from "./groqClient";
import { fixBrand } from "./showNotes";
import { abbreviationsIn, closestCandidate, QuoteCandidate, quoteCandidates, sampleCandidates } from "./quotes";

export interface PickedQuote { text: string; time: string | null }
export interface Explainer { term: string; kind: "abbr" | "tech"; meaning: string; example: string; source: "episode" | "general"; include: boolean }

export function candidatesFor(kit: any): QuoteCandidate[] {
  return quoteCandidates(kit.transcript || "", kit.guest_name, kit.host_name);
}

/** 3 strong quotes, verbatim, with their times; skips the ones already used. */
export async function pickQuotes(kit: any, exclude: string[], count = 3): Promise<PickedQuote[]> {
  const cands = candidatesFor(kit);
  if (!cands.length) throw new Error("No guest quotes found in the stored transcript. Re-run Step 1 with a Riverside transcript that has speaker names and timestamps.");
  const sample = sampleCandidates(cands, exclude);
  if (!sample.length) throw new Error("Every quote has been used already.");
  const out = await groqJson({
    prompt: `Profit Streams® Podcast. Guest: ${kit.guest_name}. Host: ${kit.host_name}. Episode: "${kit.title}".
Below are numbered lines the GUEST actually said. Choose the ${count} best for a social media quote card: self-contained (makes sense with no context), surprising or wise, specific, about business, pricing, product or leadership. Avoid lines that need the conversation to be understood, small talk, and lines about the podcast itself.
Respond with JSON only: {"picks": [numbers]}

${sample.map((c) => `${c.id}. ${c.text}`).join("\n")}`,
    maxTokens: 500, temperature: 0.5,
  });
  const ids: number[] = (Array.isArray(out.picks) ? out.picks : []).map(Number).filter((n: number) => Number.isInteger(n));
  const chosen = ids.map((id) => cands.find((c) => c.id === id)).filter(Boolean) as QuoteCandidate[];
  const fallback = sample.filter((c) => !chosen.includes(c)).sort((a, b) => b.text.length - a.text.length);
  return [...chosen, ...fallback].slice(0, count).map((c) => ({ text: fixBrand(c.text), time: c.time }));
}

/** Turns any quote (e.g. one the AI suggested in the first draft) into the real words + time, when it's close enough. */
export function verifyQuote(kit: any, line: string): PickedQuote | null {
  const hit = closestCandidate(line, candidatesFor(kit));
  return hit && hit.score >= 0.6 ? { text: fixBrand(hit.cand.text), time: hit.cand.time } : null;
}

/** Text around the quote in the transcript, so the explainer uses what the guest said about it. */
function contextAround(transcript: string, quote: string): string {
  const key = quote.split(/\s+/).slice(0, 6).join(" ");
  const i = transcript.indexOf(key);
  if (i < 0) return "";
  return transcript.slice(Math.max(0, i - 2500), i + 2500);
}

/** An explainer slide for jargon or a new technology in the quote, or null when the quote needs none. */
export async function explainQuote(kit: any, quote: string): Promise<Explainer | null> {
  const abbr = abbreviationsIn(quote);
  const ctx = contextAround(kit.transcript || "", quote);
  const out = await groqJson({
    prompt: `A podcast quote card shows this line from ${kit.guest_name}: "${quote}"
Audience: business leaders aged 35 to 70, not all technical.
${abbr.length ? `Abbreviations in it: ${abbr.join(", ")}.` : ""}
Does the line contain ONE abbreviation, acronym, technical term or new technology a business reader may not know, which is central to the line? If not, answer {"term": null}.
If yes, explain it. Use what the conversation says first; only if it doesn't explain it, use well-established general knowledge, and if you are not sure what it means here, answer {"term": null}.
Conversation around the quote:
${ctx || "(not available)"}

Respond with JSON only: {"term": "MQ", "kind": "abbr" or "tech", "meaning": "one plain sentence, under 25 words, starting with the full name for an abbreviation", "example": "one concrete everyday business example, under 30 words", "source": "episode" or "general"}
Never use em-dashes.`,
    maxTokens: 600, temperature: 0.2,
  });
  if (!out || !out.term || !out.meaning) return null;
  const clean = (s: unknown) => fixBrand(String(s || "")).replace(/\s*[—–]\s*/g, ", ").trim();
  return {
    term: clean(out.term).slice(0, 30), kind: out.kind === "tech" ? "tech" : "abbr",
    meaning: clean(out.meaning).slice(0, 220), example: clean(out.example).slice(0, 240),
    source: out.source === "episode" ? "episode" : "general", include: true,
  };
}
