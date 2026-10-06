/**
 * Reads Riverside caption exports (.srt, also .vtt) into timed pieces, and
 * groups them into ~15-second blocks for the Clip Finder. Pure functions.
 */
export interface Cue { start: number; end: number; text: string }
export interface Block { id: number; start: number; end: number; text: string }

// 00:01:02,345 · 00:01:02.345 · 01:02.345
const TIME = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/;

function toSeconds(t: string): number | null {
  const m = t.trim().match(TIME);
  if (!m) return null;
  const [, h, mm, ss, ms] = m;
  return (Number(h || 0) * 3600) + Number(mm) * 60 + Number(ss) + Number(ms.padEnd(3, "0")) / 1000;
}

/** Parses .srt or .vtt text. Returns [] if there are no timestamps (e.g. a plain .txt). */
export function parseCaptions(raw: string): Cue[] {
  const cues: Cue[] = [];
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes("-->")) continue;
    const [a, b] = lines[i].split("-->");
    const start = toSeconds(a);
    const end = toSeconds(b || "");
    if (start === null || end === null) continue;
    const text: string[] = [];
    for (let j = i + 1; j < lines.length && lines[j].trim() !== "" && !lines[j].includes("-->"); j++) {
      text.push(lines[j].replace(/<[^>]+>/g, "").trim());
      i = j;
    }
    const t = text.join(" ").replace(/\s+/g, " ").trim();
    if (t) cues.push({ start, end: Math.max(end, start), text: t });
  }
  return cues;
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}

/** Joins captions into ~targetSec blocks so the AI can point at sections by number. */
export function buildBlocks(cues: Cue[], targetSec = 15): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  for (const c of cues) {
    if (!cur || c.end - cur.start > targetSec) {
      cur = { id: blocks.length + 1, start: c.start, end: c.end, text: c.text };
      blocks.push(cur);
    } else {
      cur.end = c.end;
      cur.text += " " + c.text;
    }
  }
  return blocks;
}

/** Splits blocks into chunks small enough for one free-tier AI call each. */
export function chunkBlocks(blocks: Block[], maxChars = 16000): Block[][] {
  const chunks: Block[][] = [];
  let cur: Block[] = [];
  let size = 0;
  for (const b of blocks) {
    const len = b.text.length + 20;
    if (cur.length && size + len > maxChars) { chunks.push(cur); cur = []; size = 0; }
    cur.push(b);
    size += len;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}
