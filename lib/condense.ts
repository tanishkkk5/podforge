/**
 * Full-transcript reading on Groq's free tier (decision 0019).
 * Free tier = 8,000 tokens per minute, so a whole episode can't go in one request.
 * Instead: (1) clean the transcript (no AI), (2) split it into parts, (3) the AI writes compact notes for each
 * part, one part per minute, (4) the episode is drafted from ALL the notes. Nothing is cut off.
 * Pure functions here (safe in the browser and on the server).
 */

/** Characters per part: ~4,500 tokens, leaves room for instructions + notes within 8,000 tokens/minute. */
export const PART_CHARS = 18000;
/** Up to this size the old single-request path still reads everything. */
export const SINGLE_PASS_CHARS = 23000;
/** Seconds to wait between AI requests so we stay under 8,000 tokens per minute. */
export const PACE_SECONDS = 62;

// Only pure fillers: "kind of", "sort of" etc. can carry meaning, so they stay.
const FILLERS = /\b(?:um+|uh+|erm|hmm+)\b,?\s*|\byou know,\s*/gi;

/**
 * Removes what the AI doesn't need: Riverside timestamps, repeated speaker headers, filler words,
 * extra spaces. Keeps every real word the guest said. Typically 15 to 30% shorter.
 */
export function cleanTranscript(raw: string): string {
  const lines = (raw || "").replace(/^﻿/, "").split(/\r?\n/);
  const out: string[] = [];
  let lastSpeaker = "";
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (/^\d+$/.test(line)) continue; // .srt counters
    if (/-->/.test(line)) continue; // .srt/.vtt timings
    if (/^WEBVTT/i.test(line)) continue;
    // "Luke Hohmann (00:01:02)" or "Luke Hohmann 00:01" speaker headers → "Luke Hohmann:"
    const sp = line.match(/^(.{1,60}?)\s*\(?\d{1,2}:\d{2}(?::\d{2})?\)?\s*$/);
    if (sp) {
      const name = sp[1].trim();
      if (name && name !== lastSpeaker) { out.push(`\n${name}:`); lastSpeaker = name; }
      continue;
    }
    line = line.replace(/\[?\(?\b\d{1,2}:\d{2}(?::\d{2})?\b\)?\]?/g, ""); // inline timestamps
    line = line.replace(FILLERS, "");
    line = line.replace(/\b(\w+)( \1\b)+/gi, "$1"); // "the the" → "the"
    line = line.replace(/\s{2,}/g, " ").trim();
    if (line) out.push(line);
  }
  return out.join(" ").replace(/ \n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Splits on sentence boundaries into parts of at most `max` characters. */
export function splitParts(text: string, max = PART_CHARS): string[] {
  const t = text.trim();
  if (t.length <= max) return [t];
  const parts: string[] = [];
  let start = 0;
  while (start < t.length) {
    let end = Math.min(start + max, t.length);
    if (end < t.length) {
      const window = t.slice(start + Math.floor(max * 0.75), end);
      const cut = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "), window.lastIndexOf("\n"));
      if (cut > 0) end = start + Math.floor(max * 0.75) + cut + 1;
    }
    parts.push(t.slice(start, end).trim());
    start = end;
  }
  return parts.filter(Boolean);
}

/** How the reading will go, for the progress message. */
export function readingPlan(raw: string): { cleaned: string; parts: string[]; minutes: number; singlePass: boolean } {
  const cleaned = cleanTranscript(raw);
  if (cleaned.length <= SINGLE_PASS_CHARS) return { cleaned, parts: [cleaned], minutes: 1, singlePass: true };
  const parts = splitParts(cleaned);
  return { cleaned, parts, minutes: parts.length + 1, singlePass: false };
}
