import { fixBrand } from "./showNotes";

/**
 * Automatic fixes applied to every transcript that enters Podforge (guest kit
 * generator, Content Library). Only SAFE, unambiguous phrases are fixed —
 * names that could be real people or words are left for a person to check
 * with the Transcript Checker. To add a fix, add a row and note it in
 * knowledge/standards/brand-profit-streams.md.
 */
const FIXES: [RegExp, string][] = [
  [/\bskilled agile\b/gi, "Scaled Agile"],
];

export function fixTranscript(text: string): { text: string; fixes: number } {
  let fixes = 0;
  let out = text || "";
  // Brand spelling (counts only real changes)
  const branded = fixBrand(out);
  if (branded !== out) {
    fixes += (out.match(/\b(?:profit|prophet)\s+streams?\b(?:\s*®)?/gi) || []).filter((m) => m !== "Profit Streams®").length;
    out = branded;
  }
  for (const [re, to] of FIXES) {
    out = out.replace(re, (m) => { if (m !== to) fixes++; return to; });
  }
  return { text: out, fixes };
}
