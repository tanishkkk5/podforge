/**
 * Bold key phrases (decision 0017).
 * Anywhere Podforge stores text, a key phrase can be marked **like this**.
 *  - Captions (LinkedIn/Instagram): marked phrases become Unicode bold letters (𝗹𝗶𝗸𝗲 𝘁𝗵𝗶𝘀), the only bold
 *    those apps show. Keep it to 2-3 phrases: Unicode bold isn't searchable and screen readers struggle with it.
 *  - Image cards: marked phrases are drawn bold in Bright Blue.
 *  - Show notes / Spotify / Apple / RAG: markers are removed (plain text).
 */

const MARK = /\*\*([^*\n]{1,120}?)\*\*/g;

export function stripMarks(s: string): string {
  return (s || "").replace(MARK, "$1");
}

function boldChar(ch: string): string {
  const c = ch.codePointAt(0)!;
  if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d5d4 + (c - 65)); // A-Z sans-serif bold
  if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d5ee + (c - 97)); // a-z
  if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7ec + (c - 48)); // 0-9
  return ch;
}

export function toUnicodeBold(s: string): string {
  return Array.from(s || "").map(boldChar).join("");
}

/** **phrase** → 𝗽𝗵𝗿𝗮𝘀𝗲 (for LinkedIn / Instagram captions). */
export function applyBoldMarks(s: string): string {
  return (s || "").replace(MARK, (_, inner: string) => toUnicodeBold(inner));
}

/** Splits text into runs for drawing: [{ text, bold }]. */
export function markRuns(s: string): { text: string; bold: boolean }[] {
  const runs: { text: string; bold: boolean }[] = [];
  let last = 0;
  for (const m of (s || "").matchAll(MARK)) {
    if (m.index! > last) runs.push({ text: s.slice(last, m.index), bold: false });
    runs.push({ text: m[1], bold: true });
    last = m.index! + m[0].length;
  }
  if (last < (s || "").length) runs.push({ text: s.slice(last), bold: false });
  return runs;
}
