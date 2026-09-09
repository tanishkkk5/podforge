/**
 * Voyage AI embeddings — free tier covers 200 million tokens, which is far
 * more than our entire transcript archive will ever use. This is the only
 * paid-capable service in this feature, but stays $0 at our scale.
 */

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";

export async function embedTexts(
  texts: string[],
  inputType: "document" | "query"
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VOYAGE_API_KEY environment variable.");
  }

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: "voyage-4",
      input_type: inputType,
      output_dimension: 1024,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Voyage API error (${res.status}): ${errText}`);
  }

  const body = await res.json();
  return body.data.map((d: any) => d.embedding);
}

/**
 * Splits a transcript into overlapping chunks small enough to embed well
 * and retrieve precisely, without cutting sentences too awkwardly.
 */
export function chunkText(text: string, chunkSize = 1000, overlap = 150): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }
  return chunks;
}
