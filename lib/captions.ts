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

// Riverside .txt speaker line, e.g. "Luke Hohmann (00:01)" or "Mike Gilpin (1:02:15)"
const SPEAKER_LINE = /^\s*(.{1,60}?)\s*\((\d{1,2}(?::\d{2}){1,2})\)\s*$/;

function clockToSeconds(t: string): number {
  return t.split(":").map(Number).reduce((acc, n) => acc * 60 + n, 0);
}

/**
 * Riverside .txt exports with speaker timestamps. Each speaker turn has a
 * start time; long turns are split into sentences and their times are
 * spread across the turn by length — accurate to within a few seconds.
 */
export function parseTimestampedText(raw: string): Cue[] {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  const turns: { start: number; text: string }[] = [];
  for (const line of lines) {
    const m = line.match(SPEAKER_LINE);
    if (m) turns.push({ start: clockToSeconds(m[2]), text: "" });
    else if (turns.length && line.trim()) turns[turns.length - 1].text += (turns[turns.length - 1].text ? " " : "") + line.trim();
  }
  const cues: Cue[] = [];
  turns.forEach((t, i) => {
    const text = t.text.replace(/\s+/g, " ").trim();
    if (!text) return;
    const words = text.split(" ").length;
    const next = turns.slice(i + 1).find((x) => x.start > t.start);
    // ~2.5 words per second of speech; a turn never "lasts" much longer than its words
    // (protects against long pauses or gaps before the next speaker)
    const speaking = Math.max(2, words / 2.5);
    const end = next ? Math.min(next.start, t.start + speaking * 2) : t.start + speaking;
    const span = Math.max(1, end - t.start);
    // split into sentences (keep very long sentences in ~30-word pieces)
    const parts: string[] = [];
    for (const sentence of text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [text]) {
      const w = sentence.trim().split(" ");
      for (let k = 0; k < w.length; k += 30) parts.push(w.slice(k, k + 30).join(" "));
    }
    const total = parts.reduce((n, p) => n + p.length, 0) || 1;
    let at = t.start;
    for (const p of parts) {
      const dur = (span * p.length) / total;
      cues.push({ start: at, end: at + dur, text: p });
      at += dur;
    }
  });
  return cues;
}

/** True when the file has real caption timings (.srt/.vtt) rather than speaker timestamps. */
export function hasExactTimings(raw: string): boolean {
  return /-->/.test(raw);
}

/**
 * Parses .srt / .vtt captions, or a Riverside .txt with speaker timestamps.
 * Returns [] if there are no timestamps at all (e.g. a plain transcript).
 */
export function parseCaptions(raw: string): Cue[] {
  if (!hasExactTimings(raw)) return parseTimestampedText(raw);
  return parseSrtVtt(raw);
}

function parseSrtVtt(raw: string): Cue[] {
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
