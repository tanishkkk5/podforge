/**
 * Calls the Groq API (groq.com — not to be confused with xAI's Grok) to turn
 * a raw transcript into structured content: Title, hook, Summary, exactly 10
 * Key Takeaways, and the single best quote.
 *
 * Cost: $0. Groq's free tier requires no credit card — 30 requests/minute,
 * 14,400 requests/day. We make one call per episode, nowhere close to that
 * limit. Uses Llama 3.3 70B, a solid open-source model for this kind of
 * structured extraction task.
 */

interface ExtractedContent {
  title: string;
  hook: string;
  summary: string;
  takeaways: string[]; // always exactly 10
  bestQuote: string;
  guestTitle: string;
}

export async function extractEpisodeContent(
  transcript: string,
  guestName: string,
  hostName: string
): Promise<ExtractedContent> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY environment variable.");
  }

  const prompt = `You are producing show notes for the Profit Streams® Podcast, hosted by ${hostName}. The guest this episode is ${guestName}.

Below is the full raw transcript. Extract the following, and respond with ONLY valid JSON, no other text, no markdown code fences, no explanation before or after:

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

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error("No text response from Groq API.");

  // Strip any accidental markdown fences or leading/trailing text before parsing
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const cleaned = jsonMatch ? jsonMatch[0] : rawText.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed.takeaways) || parsed.takeaways.length !== 10) {
    throw new Error(
      `Expected exactly 10 takeaways, got ${parsed.takeaways?.length ?? 0}. Response may need manual review.`
    );
  }

  return parsed;
}
