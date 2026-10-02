/**
 * Applied Frameworks' own frameworks/products and their pages on
 * appliedframeworks.com. If a transcript mentions one, Podforge links it
 * automatically (show notes, Content Library, creator kits).
 *
 * Only SPECIFIC phrases are matched (e.g. "Horizon Engage", never the bare
 * word "horizon"), so ordinary speech like "time horizon" won't trigger it.
 * Every URL below was confirmed live in the Oct 2026 Screaming Frog crawl.
 * To add one: copy an entry, set the name, page URL and phrases.
 */
export interface Framework {
  name: string;
  url: string;
  patterns: RegExp[];
}

export const FRAMEWORKS: Framework[] = [
  {
    name: "Horizon™ Engage",
    url: "https://appliedframeworks.com/horizon-engage",
    // Horizon Engage was formerly called SAFe® Collaborate
    patterns: [/\bhorizon\s*(?:™\s*)?engage\b/i, /\bsafe\s*(?:®\s*)?collaborate\b/i],
  },
  {
    name: "Horizon™ Invest",
    url: "https://appliedframeworks.com/horizon-invest",
    patterns: [/\bhorizon\s*(?:™\s*)?invest\b/i],
  },
  {
    name: "The Horizon™ Platform",
    url: "https://appliedframeworks.com/horizon",
    patterns: [/\bhorizon\s*(?:™\s*)?platform\b/i],
  },
  {
    name: "KNOWSY™",
    url: "https://appliedframeworks.com/knowsy",
    patterns: [/\bknowsy\b/i],
  },
  {
    name: "Collapsing Sliding Windows",
    url: "https://appliedframeworks.com/collapsing-sliding-windows-applied-frameworks",
    patterns: [/\bcollapsing\s+sliding\s+windows?\b/i],
  },
  {
    name: "Facts, Feelings and Forecasts",
    url: "https://appliedframeworks.com/facts-feelings-and-forecasts",
    patterns: [/\bfacts,?\s+feelings,?\s+(?:and|&)\s+forecasts\b/i],
  },
  {
    name: "Solution Profitability Management",
    url: "https://appliedframeworks.com/spm",
    patterns: [/\bsolution\s+profitability\s+management\b/i],
  },
];

/** Names of every framework mentioned in the text, in list order. */
export function detectFrameworks(text: string): string[] {
  const t = text || "";
  return FRAMEWORKS.filter((f) => f.patterns.some((p) => p.test(t))).map((f) => f.name);
}

export function frameworkByName(name: string): Framework | undefined {
  return FRAMEWORKS.find((f) => f.name === name);
}

/** Ready-made resource rows for show notes. */
export function frameworkResources(names: string[]) {
  return names
    .map(frameworkByName)
    .filter(Boolean)
    .map((f) => ({ label: `Learn more about ${f!.name}`, type: "framework", url: f!.url }));
}
