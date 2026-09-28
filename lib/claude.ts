/**
 * Calls the Claude API to turn a raw transcript into structured content:
 * Title, hook, Summary, exactly 10 Key Takeaways, Chapters (if not already
 * provided), and the single best quote to feature.
 *
 * Cost note: uses Claude Haiku (the cheapest current model) since this is
 * a straightforward extraction task, not something requiring the most
 * powerful reasoning. Roughly $0.02-0.03 per episode at typical transcript
 * length.
 */

interface ExtractedContent {
  title: string;
  hook: string;
  summary: string;
  takeaways: string[]; // always exactly 10
  bestQuote: string;
  guestTitle: string; // a short professional title/role for the guest
}

export async function extractEpisodeContent(
  transcript: string,
  guestName: string,
  hostName: string
): Promise<ExtractedContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable.");
  }

  const prompt = `You are producing show notes for the Profit Streams® Podcast, hosted by ${hostName}. The guest this episode is ${guestName}.

Below is the full raw transcript. Extract the following, and respond with ONLY valid JSON, no other text, no markdown code fences:

{
  "title": "A punchy episode title, under 60 characters, capturing the core idea (not generic)",
  "hook": "One sentence, under 25 words, that would make someone want to read more — the single most surprising or provocative idea from the episode",
  "summary": "A 2-3 sentence summary of what the episode covers, written in third person",
  "takeaways": ["exactly 10 key takeaways, each a complete sentence capturing a distinct idea from the conversation, ordered roughly by how they appear in the conversation"],
  "bestQuote": "The single most quotable, self-contained line from the guest in the transcript — must be an exact quote, verbatim from the transcript, under 200 characters",
  "guestTitle": "A short professional title/role for the guest, inferred from how they're introduced or what they discuss (e.g. 'Strategic Portfolio Management Expert')"
}

Important: "Profit Streams" must always be written as "Profit Streams®" with the registered trademark symbol, in the title, hook, and summary fields.

Transcript:
${transcript}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const textBlock = data.content.find((c: any) => c.type === "text");
  if (!textBlock) throw new Error("No text response from Claude API.");

  // Strip any accidental markdown fences before parsing
  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed.takeaways) || parsed.takeaways.length !== 10) {
    throw new Error(
      `Expected exactly 10 takeaways, got ${parsed.takeaways?.length ?? 0}. Response may need manual review.`
    );
  }

  return parsed;
}
