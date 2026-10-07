import { fixBrand } from "../showNotes";
import { groqJson } from "../groqClient";

/**
 * Outreach Drafter (knowledge/skills/outreach-drafter.md).
 * One job: draft Luke's guest invitation from the standard template
 * (knowledge/templates/guest-outreach-message.md). The AI writes ONLY the one
 * personalized line, from the notes a person typed in — everything else is the
 * fixed template. A person reviews it; it's sent from Luke's account by hand.
 */
export function outreachMessage(name: string, personalLine: string): string {
  const first = name.trim().split(/\s+/)[0] || "there";
  const line = personalLine.trim();
  return [
    `Hi ${first} — I'm Luke Hohmann, host of the Profit Streams® Podcast at Applied Frameworks. We've had some great conversations lately with folks like Nir Eyal and Mik Kersten, and I think you'd bring a perspective our audience of product, pricing, and business leaders would really value.`,
    ...(line ? ["", line] : []),
    "",
    `Would you be up for coming on the show for a conversation? Happy to work around your schedule — always remote, always low-lift.`,
  ].join("\n");
}

export async function draftOutreach(name: string, notes: string): Promise<{ title: string; content: string }> {
  const n = name.trim();
  const facts = notes.trim();
  if (!n) throw new Error("Add the person's name.");
  if (facts.length < 15) throw new Error("Add a few notes about them (their book, research, a recent post) so the message can be personal.");

  const prompt = `Write ONE sentence (max 30 words) for Luke Hohmann to include in a podcast invitation to ${n}, saying specifically why their work interests the Profit Streams® Podcast audience (product, pricing and business leaders).
Use ONLY these notes — do not add any fact, number, title or achievement that isn't in them:
"""${facts.slice(0, 1500)}"""
Write in Luke's first person, warm and specific: name ONE concrete detail from the notes (a title, topic, number or project) and connect it to what our listeners care about. Don't open with "I'm fascinated", "I love", "I admire" or "I've been following". No flattery clichés, no buzzwords like "actionable insights", no greeting, no sign-off.
Respond with ONLY JSON: {"line": "..."}`;

  const parsed = await groqJson({ prompt, maxTokens: 800, temperature: 0.5 });
  let line = String(parsed?.line || "");
  line = fixBrand(line.replace(/\s+/g, " ").trim()).slice(0, 300);
  return { title: `Outreach: invitation to ${n}`, content: outreachMessage(n, line) };
}
