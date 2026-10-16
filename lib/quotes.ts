/**
 * Real quotes only (decision 0020). Pure functions, no AI.
 * The transcript is split into speaker turns ("Mike Gilpin (00:23:41)" headers from Riverside), each sentence gets an
 * estimated timestamp, and only sentences the GUEST actually said become quote candidates. The AI may only PICK a
 * candidate by number, so a quote card can never show words nobody said.
 */

export interface QuoteCandidate { id: number; text: string; time: string | null; seconds: number | null; speaker: string }

const SPEAKER = /^\s*(.{1,60}?)\s*[\(\[]?(\d{1,2}(?::\d{2}){1,2})[\)\]]?\s*$/;
const toSec = (t: string) => t.split(":").map(Number).reduce((a, n) => a * 60 + n, 0);
export function clock(sec: number): string {
  const s = Math.max(0, Math.round(sec)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(r)}` : `${p(m)}:${p(r)}`;
}
const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

interface Turn { speaker: string; start: number | null; text: string }

export function parseTurns(raw: string): Turn[] {
  const turns: Turn[] = [];
  for (const line of (raw || "").replace(/^﻿/, "").split(/\r?\n/)) {
    const m = line.match(SPEAKER);
    if (m && /[a-z]/i.test(m[1])) { turns.push({ speaker: m[1].trim(), start: toSec(m[2]), text: "" }); continue; }
    const t = line.trim();
    if (!t) continue;
    if (!turns.length) turns.push({ speaker: "", start: null, text: "" });
    turns[turns.length - 1].text += (turns[turns.length - 1].text ? " " : "") + t;
  }
  return turns.filter((t) => t.text);
}

/** Does this speaker label belong to the guest (and not the host)? */
function isGuest(speaker: string, guest: string, host: string): boolean {
  const s = norm(speaker), g = norm(guest), h = norm(host);
  if (!s) return false;
  if (h && (s === h || s.includes(h.split(" ")[0]))) return false;
  return s === g || g.split(" ").some((w) => w.length > 2 && s.includes(w));
}

// Only pure fillers are trimmed; every other word stays exactly as said.
const FILLER = /\b(?:um+|uh+|erm)\b,?\s*|\byou know,\s*/gi;

/** Every quotable sentence (or pair of short sentences) the guest said, with its estimated time. */
export function quoteCandidates(raw: string, guest: string, host: string): QuoteCandidate[] {
  const turns = parseTurns(raw);
  const hasSpeakers = turns.some((t) => t.speaker);
  const out: QuoteCandidate[] = [];
  turns.forEach((t, ti) => {
    if (hasSpeakers && !isGuest(t.speaker, guest, host)) return;
    const next = turns.slice(ti + 1).find((x) => x.start !== null && t.start !== null && x.start > t.start);
    const span = t.start !== null && next?.start != null ? next.start - t.start : null;
    const sentences = t.text.match(/[^.!?]+[.!?]+["')\]]*/g) || [t.text];
    let offset = 0;
    const total = t.text.length || 1;
    for (let i = 0; i < sentences.length; i++) {
      let s = sentences[i].trim();
      const at = offset; offset += sentences[i].length;
      // join a short sentence with the next one, so the thought is complete
      if (s.length < 70 && sentences[i + 1] && (s + " " + sentences[i + 1].trim()).length <= 220) s = `${s} ${sentences[i + 1].trim()}`;
      const clean = s.replace(FILLER, "").replace(/\s{2,}/g, " ").trim();
      if (clean.length < 50 || clean.length > 220) continue;
      if (/^(yeah|yes|right|so|and|but|well|okay|ok|absolutely|exactly)\b[,. ]/i.test(clean) && clean.length < 80) continue;
      const seconds = t.start === null ? null : t.start + (span ? (span * at) / total : 0);
      out.push({ id: out.length, text: clean, time: seconds === null ? null : clock(seconds), seconds, speaker: t.speaker || guest });
    }
  });
  // drop near-duplicates (the pair join creates overlaps)
  const seen = new Set<string>();
  return out.filter((c) => { const k = norm(c.text).slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; })
    .map((c, i) => ({ ...c, id: i }));
}

/** The candidate closest to a given line (to turn an AI-suggested quote into the real words + time). */
export function closestCandidate(line: string, cands: QuoteCandidate[]): { cand: QuoteCandidate; score: number } | null {
  const a = new Set(norm(line).split(" ").filter((w) => w.length > 2));
  if (!a.size || !cands.length) return null;
  let best: { cand: QuoteCandidate; score: number } | null = null;
  for (const c of cands) {
    const b = new Set(norm(c.text).split(" ").filter((w) => w.length > 2));
    let hit = 0; a.forEach((w) => { if (b.has(w)) hit++; });
    const score = hit / Math.max(a.size, 1);
    if (!best || score > best.score) best = { cand: c, score };
  }
  return best;
}

/** A spread-out sample of candidates that fits one free-tier AI request. */
export function sampleCandidates(cands: QuoteCandidate[], exclude: string[], max = 110, maxChars = 15000): QuoteCandidate[] {
  const ex = new Set(exclude.map((e) => norm(e).slice(0, 60)));
  const pool = cands.filter((c) => !ex.has(norm(c.text).slice(0, 60)));
  const step = Math.max(1, pool.length / max);
  const picked: QuoteCandidate[] = [];
  let chars = 0;
  for (let i = 0; i < pool.length && picked.length < max; i += step) {
    const c = pool[Math.floor(i)];
    if (chars + c.text.length > maxChars) break;
    picked.push(c); chars += c.text.length + 8;
  }
  return picked;
}

/** All-caps abbreviations worth explaining (MQ, SPM, OKR …), minus the ones everyone knows. */
const COMMON = new Set(["I", "AI", "CEO", "CFO", "CTO", "COO", "USA", "US", "UK", "OK", "TV", "PM", "AM", "IT", "HR", "PR", "PDF", "FAQ", "VP", "ROI", "B2B", "B2C"]);
export function abbreviationsIn(text: string): string[] {
  const found = (text || "").match(/\b[A-Z][A-Z0-9&]{1,5}s?\b/g) || [];
  return Array.from(new Set(found.map((f) => f.replace(/s$/, "")))).filter((f) => !COMMON.has(f));
}
