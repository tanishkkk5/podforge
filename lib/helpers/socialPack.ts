import { fixBrand, withAffiliateTag, isAmazonUrl, STANDARD_RESOURCES } from "../showNotes";
import { groqJson } from "../groqClient";

/**
 * Social Pack Writer (knowledge/skills/social-pack-writer.md).
 * One job: write LinkedIn snippet posts and Instagram captions for the SHOW'S
 * own accounts, using only the approved guest kit's content. Hashtags, the
 * guest tag reminder and the listen link are added by code.
 */
export interface KitForSocial {
  title: string;
  hook: string | null;
  summary: string | null;
  takeaways: string[];
  best_quote: string | null;
  guest_name: string;
  host_name: string;
  episode_number: string | null;
  resources?: { label: string; type: string; url?: string }[] | null;
  extras?: { spotifyUrl?: string; appleUrl?: string; episodePageUrl?: string } | null;
}

const LISTEN = "https://profit-streams.com/profit-streams-podcast";

/** The book to promote: the guest's book from the kit (Amazon link, tagged), else the Profit Streams® book. */
export function bookToPromote(kit: KitForSocial): { title: string; url: string } {
  const book = (kit.resources || []).find((r) => r.type === "book" && r.url && isAmazonUrl(r.url));
  if (book?.url) return { title: book.label.replace(/^Get\s+/i, ""), url: withAffiliateTag(book.url) };
  return { title: "Software Profit Streams™ (the #1 best-selling Profit Streams® book)", url: STANDARD_RESOURCES[0].url };
}

/**
 * LinkedIn (AF's page IS registered with Amazon Associates): every post gets the
 * episode link + the tagged Amazon book link + the disclosure, in a "first
 * comment" block (LinkedIn tends to show posts with links in the body to fewer people).
 * Instagram is NOT registered: never an Amazon link there.
 */
export function assembleSocialPack(kit: KitForSocial, li: string[], ig: string[]): string {
  const tag = `@${kit.guest_name}`;
  const episode = kit.extras?.episodePageUrl?.trim() || kit.extras?.spotifyUrl?.trim() || kit.extras?.appleUrl?.trim() || LISTEN;
  const book = bookToPromote(kit);
  const firstComment =
    `🎧 Full episode: ${episode}\n📘 Get the book — ${book.title}: ${book.url}\n\n#ad · As an Amazon Associate, we earn from qualifying purchases.`;
  const posts = li.slice(0, 3).map((p, i) =>
    `LINKEDIN POST ${i + 1}\n${fixBrand(p.trim())}\n\nNew Profit Streams® Podcast episode with ${tag} — episode + book links in the first comment 👇\n#ProfitStreamsPodcast #Leadership\n\nFIRST COMMENT (post it right after publishing):\n${firstComment}`
  );
  const caps = ig.slice(0, 2).map((p, i) =>
    `INSTAGRAM CAPTION ${i + 1}\n${fixBrand(p.trim())}\n\nNew episode with ${tag} — link in bio 🎧\n📘 The book we discussed is linked in the episode notes.\n.\n.\n.\n#ProfitStreamsPodcast #Leadership #Podcast`
  );
  return [
    `Social pack — Ep-${kit.episode_number || "?"} with ${kit.guest_name}`,
    `Remember: replace ${tag} with a real @-mention when posting.`,
    `⚠️ Amazon links go on LinkedIn only (registered with Amazon Associates). Never paste an Amazon link on Instagram.`,
    "",
    ...posts.flatMap((p) => [p, ""]),
    ...caps.flatMap((p) => [p, ""]),
  ].join("\n").trim();
}

export async function draftSocialPack(kit: KitForSocial): Promise<{ title: string; content: string }> {
  const prompt = `Write social posts for the Profit Streams® Podcast's OWN LinkedIn and Instagram accounts, promoting the episode below.
Use ONLY the material given — no new facts, numbers or claims. Write "Profit Streams®" exactly. No hashtags, no links (added later).

- "linkedin": 3 posts, each 3–6 short lines, each from a different angle (the hook, a surprising takeaway, the guest's quote). First line must stop the scroll.
- "instagram": 2 captions, 1–2 punchy sentences each, max 2 emojis.

Respond with ONLY JSON: {"linkedin": ["...","...","..."], "instagram": ["...","..."]}

EPISODE
Title: ${kit.title}
Guest: ${kit.guest_name} · Host: ${kit.host_name}
Hook: ${kit.hook || ""}
Summary: ${kit.summary || ""}
Best quote (verbatim): "${kit.best_quote || ""}"
Takeaways:
${(kit.takeaways || []).map((t, i) => `${i + 1}. ${t}`).join("\n")}`;

  const parsed = await groqJson({ prompt, maxTokens: 1800, temperature: 0.6 });
  const li = (Array.isArray(parsed.linkedin) ? parsed.linkedin : []).map(String).filter((s: string) => s.trim());
  const ig = (Array.isArray(parsed.instagram) ? parsed.instagram : []).map(String).filter((s: string) => s.trim());
  if (!li.length && !ig.length) throw new Error("The AI didn't return any posts — try again.");
  return { title: `Social pack: Ep-${kit.episode_number || "?"} ${kit.guest_name}`, content: assembleSocialPack(kit, li, ig) };
}
