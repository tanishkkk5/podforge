import { Block, formatTime } from "../captions";
import { fixBrand } from "../showNotes";
import { groqJson } from "../groqClient";
import { Clip, MAX_CLIP_SEC, MIN_CLIP_SEC, validatePicks } from "./clipFinder";

/**
 * Episode Scanner (knowledge/skills/episode-scanner.md).
 * One AI call per transcript chunk returns BOTH chapter starts and clip picks —
 * half the free-tier usage of doing them separately. Same safety rule as the
 * Clip Finder: the AI only names block numbers; times come from Riverside's file.
 */
export interface Chapter { start: number; title: string }

export function validateChapters(raw: any[], chunk: Block[]): Chapter[] {
  const byId = new Map(chunk.map((b) => [b.id, b]));
  const out: Chapter[] = [];
  for (const c of Array.isArray(raw) ? raw : []) {
    const b = byId.get(Number(c?.at));
    const title = fixBrand(String(c?.title || "").replace(/\s+/g, " ").trim()).slice(0, 70);
    if (b && title) out.push({ start: b.start, title });
  }
  return out;
}

/** Sorted, spaced at least 90s apart, max 14, always starting at 00:00. */
export function finalizeChapters(all: Chapter[]): Chapter[] {
  const sorted = [...all].sort((a, b) => a.start - b.start);
  const kept: Chapter[] = [];
  for (const c of sorted) {
    if (kept.length && c.start - kept[kept.length - 1].start < 90) continue;
    kept.push(c);
  }
  if (!kept.length || kept[0].start > 60) kept.unshift({ start: 0, title: "Introduction" });
  else kept[0] = { ...kept[0], start: 0 };
  return kept.slice(0, 14);
}

/** The exact format the Guest Kit Generator expects: one "00:00 Title" per line. */
export function chaptersAsText(chapters: Chapter[]): string {
  return chapters.map((c) => `${formatTime(c.start)} ${c.title}`).join("\n");
}

export async function scanChunk(chunk: Block[], guest: string, isFirst: boolean): Promise<{ clips: Clip[]; chapters: Chapter[] }> {
  const prompt = `You are a podcast editor for the Profit Streams® Podcast (business, pricing, product and portfolio leadership). Guest: ${guest || "unknown"}.

Below is part of the episode transcript, split into numbered blocks of about 15 seconds.

1. "chapters": mark where a NEW topic starts in this part (usually 2–4 per part${isFirst ? ", include the opening" : ""}). Give the block number and a short chapter title (max 7 words). Only mark real topic changes.
2. "clips": pick up to 3 moments that would make great standalone social clips, ${MIN_CLIP_SEC}–${MAX_CLIP_SEC} seconds long (usually 2–6 consecutive blocks). Skip small talk, intros and outros.

Respond with ONLY JSON:
{"chapters": [{"at": <block number>, "title": "..."}],
 "clips": [{"from": <first block>, "to": <last block>, "title": "<short punchy title>", "why": "<one sentence>", "score": <1-10>}]}

Blocks:
${chunk.map((b) => `[${b.id}] (${formatTime(b.start)}) ${b.text}`).join("\n")}`;

  const parsed = await groqJson({ prompt, maxTokens: 1500, temperature: 0.3 });
  return { clips: validatePicks(parsed?.clips, chunk), chapters: validateChapters(parsed?.chapters, chunk) };
}

/** Plain transcript text from captions (for the Guest Kit Generator). */
export function captionsToText(blocks: Block[]): string {
  return blocks.map((b) => b.text).join("\n");
}
