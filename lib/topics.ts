/**
 * The fixed topic list for the Content Library. The AI may ONLY pick from
 * this list, so tags never drift ("pricing" vs "monetization" etc.).
 * To add or rename a topic, edit this list — nothing else needs changing.
 */
export const TOPICS = [
  "Pricing & Monetization",
  "AI in Business",
  "Portfolio Management",
  "SAFe & Agile",
  "Product Management",
  "Business Models & Strategy",
  "Go-to-Market & Positioning",
  "Leadership & Scaling",
  "Finance & P&L",
  "Customer Value & Outcomes",
] as const;

export type Topic = (typeof TOPICS)[number];

export function cleanTopics(input: unknown): Topic[] {
  if (!Array.isArray(input)) return [];
  const lower = new Map(TOPICS.map((t) => [t.toLowerCase(), t]));
  const out: Topic[] = [];
  for (const raw of input) {
    const t = lower.get(String(raw).trim().toLowerCase());
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}
