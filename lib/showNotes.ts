/**
 * Builds the locked "Lenny Format" Show Notes for one guest kit.
 * Pure function, no API calls — safe to use in the browser and the server.
 *
 * Rules baked in (see project standards):
 *  - "Profit Streams®" is always written exactly that way
 *  - every Amazon link gets ?tag=profitstrea0b-20
 *  - links are NEVER invented: anything missing shows as a visible
 *    [add ...] placeholder and is listed in `missing`
 */

export const AFFILIATE_TAG = "profitstrea0b-20";

/** Required wherever an Amazon affiliate link appears (Amazon Associates + FTC; decision 0015). */
export const AMAZON_DISCLOSURE = "As an Amazon Associate, Applied Frameworks earns from qualifying purchases.";
export const isAmazonUrl = (url: string) => /(^|\.)amazon\.[a-z.]+$/i.test((() => { try { return new URL(url).hostname; } catch { return ""; } })());

export const STANDARD_RESOURCES = [
  {
    label: "Get the #1 best-selling Profit Streams® book",
    url: "https://www.amazon.com/Software-Profit-Streams-Sustainably-Profitable/dp/1544540671/?tag=profitstrea0b-20",
  },
  { label: "Learn more about Profit Streams®", url: "https://profit-streams.com/" },
  { label: "Register for Profit Streams® training", url: "https://profit-streams.com/training" },
];

const KNOWN_HOST_LINKEDIN: Record<string, string> = {
  "luke hohmann": "https://www.linkedin.com/in/lukehohmann/",
  "laura caldie": "https://www.linkedin.com/in/lauracaldie/",
  "kevin mccabe": "https://www.linkedin.com/in/kevinmccabebos/",
};

export interface Resource {
  // type "framework" = an Applied Frameworks page (auto-detected)
  label: string;
  type: string;
  url?: string;
}

export interface KitExtras {
  guestLinkedin?: string;
  guestOtherLinks?: string; // one per line, e.g. "Website: https://..."
  hostLinkedin?: string;
  spotifyUrl?: string;
  appleUrl?: string;
  relatedEpisode?: string; // e.g. "Ep-48: ... with Garrick van Buren — https://..."
}

export interface ShowNotesKit {
  episode_number: string;
  title: string;
  hook: string;
  summary: string;
  guest_name: string;
  host_name: string;
  takeaways: string[];
  chapters: { time: string; title: string }[] | null;
  resources: Resource[] | null;
  extras?: KitExtras | null;
}

/** Normalizes every common mis-spelling to exactly "Profit Streams®". */
export function fixBrand(text: string): string {
  return (text || "").replace(/\b(?:profit|prophet)\s+streams?\b(?:\s*®)?/gi, "Profit Streams®");
}

/** Adds the affiliate tag to amazon.com links. Leaves everything else alone. */
export function withAffiliateTag(url: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    if (/(^|\.)amazon\.[a-z.]+$/i.test(u.hostname)) {
      u.searchParams.set("tag", AFFILIATE_TAG);
      return u.toString();
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

export function isShortAmazonLink(url: string): boolean {
  return /^https?:\/\/(www\.)?(a\.co|amzn\.to)\//i.test((url || "").trim());
}

export function buildShowNotes(kit: ShowNotesKit): { text: string; missing: string[] } {
  const missing: string[] = [];
  const extras = kit.extras || {};
  const resources = (kit.resources || []).map((r) => ({ ...r, url: (r.url || "").trim() }));
  const ep = (kit.episode_number || "").trim();

  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);

  // Title + hook + summary
  push(fixBrand(`Ep-${ep} ${kit.title} — with ${kit.guest_name}`), "");
  push(fixBrand(kit.hook), "");
  // Disclosure BEFORE any links (the standard Profit Streams® book link is always an Amazon link)
  push(`Book links in these notes are Amazon affiliate links. ${AMAZON_DISCLOSURE}`, "");
  push(fixBrand(`${kit.summary} ${kit.guest_name} joins host ${kit.host_name} for this conversation.`), "");

  // Discussion list
  push("In this conversation, we discuss:", "");
  (kit.takeaways || []).forEach((t, i) => push(`${i + 1}. ${fixBrand(t)}`));
  push("");

  // Books
  const books = resources.filter((r) => r.type === "book" && r.url);
  if (books.length) {
    push("Recommended Books");
    books.forEach((b) => push(`${fixBrand(b.label)}: ${withAffiliateTag(b.url)}`));
    push("");
  }

  // Resources
  push("Resources");
  resources
    .filter((r) => r.type !== "book" && r.url)
    .forEach((r) => push(`${fixBrand(r.label)}: ${r.url}`));
  STANDARD_RESOURCES.forEach((r) => push(`${r.label}: ${r.url}`));
  push("");

  resources
    .filter((r) => !r.url)
    .forEach((r) => missing.push(`Link for ${r.type}: "${r.label}" (left out of the notes until added)`));
  resources
    .filter((r) => r.url && isShortAmazonLink(r.url))
    .forEach((r) =>
      missing.push(`"${r.label}" uses a short Amazon link — click through and paste the full amazon.com URL so the affiliate tag can be added`)
    );

  // Where to find guest
  push(`Where to find ${kit.guest_name}`);
  if (extras.guestLinkedin?.trim()) {
    push(`• LinkedIn: ${extras.guestLinkedin.trim()}`);
  } else {
    push("• LinkedIn: [add guest LinkedIn]");
    missing.push("Guest LinkedIn URL");
  }
  (extras.guestOtherLinks || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((l) => push(`• ${l}`));
  push("");

  // Where to find host
  const hostLi =
    extras.hostLinkedin?.trim() || KNOWN_HOST_LINKEDIN[(kit.host_name || "").trim().toLowerCase()];
  push(`Where to find ${kit.host_name}`);
  if (hostLi) {
    push(`• LinkedIn: ${hostLi}`);
  } else {
    push("• LinkedIn: [add host LinkedIn]");
    missing.push("Host LinkedIn URL");
  }
  push("");

  // Chapters
  const chapters = kit.chapters || [];
  push("In this episode, we cover:");
  if (chapters.length) {
    chapters.forEach((c) => push(`(${c.time}) ${fixBrand(c.title)}`));
  } else {
    push("[add chapters]");
    missing.push("Chapters (none were pasted when the kit was generated)");
  }
  push("");

  // Related + listen links
  push("Related Episodes");
  if (extras.relatedEpisode?.trim()) {
    push(fixBrand(extras.relatedEpisode.trim()));
  } else {
    push("[add a related past episode]");
    missing.push("Related episode");
  }
  push("Listen: https://profit-streams.com/profit-streams-podcast");
  if (extras.spotifyUrl?.trim()) push(`Spotify: ${extras.spotifyUrl.trim()}`);
  else {
    push("Spotify: [add episode link]");
    missing.push("Spotify episode link");
  }
  if (extras.appleUrl?.trim()) push(`Apple Podcasts: ${extras.appleUrl.trim()}`);
  else {
    push("Apple Podcasts: [add episode link]");
    missing.push("Apple Podcasts episode link");
  }
  push("", "Production and marketing by Applied Frameworks.");

  return { text: lines.join("\n"), missing };
}
