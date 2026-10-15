/**
 * Guest kit captions (decision 0016). Pure functions, safe in the browser and on the server.
 *
 * Every caption = editable BODY (AI or person) + fixed FOOTER (always added, can't be edited away) + HASHTAGS.
 * The footer always carries:
 *   - the episode link(s): Spotify + Apple once known, else the episode page, else the podcast page
 *   - Luke Hohmann's LinkedIn (and the episode host's, when it isn't Luke)
 *   - the tagged Profit Streams® book link + the #ad disclosure, when amazon_in_guest_posts is on
 * Never an em-dash, never an invented link.
 */
import { fixBrand } from "./showNotes";

export type Platform = "li" | "ig";
export type PostKey = "title" | "summary" | "quote" | "takeaways" | "chapters";
export type Captions = Partial<Record<PostKey, Partial<Record<Platform, string>>>>;

export const POSTS: { key: PostKey; label: string; file: string }[] = [
  { key: "title", label: "Episode Announcement", file: "1 Announcement" },
  { key: "summary", label: "The Big Idea", file: "2 Big Idea" },
  { key: "quote", label: "Quote Card", file: "3 Quote" },
  { key: "takeaways", label: "Key Takeaways Carousel", file: "4 Takeaway" },
  { key: "chapters", label: "Episode Chapters", file: "5 Chapters" },
];

export const PODCAST_PAGE = "https://profit-streams.com/profit-streams-podcast";
export const LUKE_LINKEDIN = "https://www.linkedin.com/in/lukehohmann/";
export const BOOK_LINK_TAGGED = "https://www.amazon.com/Software-Profit-Streams-Sustainably-Profitable/dp/1544540671/?tag=profitstrea0b-20";
export const AD_LINE = "#ad · As an Amazon Associate, Applied Frameworks earns from qualifying purchases.";
export const DEFAULT_HASHTAGS = "#ProfitStreamsPodcast #Leadership #Podcast";

const HOST_LINKEDIN: Record<string, string> = {
  "luke hohmann": LUKE_LINKEDIN,
  "laura caldie": "https://www.linkedin.com/in/lauracaldie/",
  "kevin mccabe": "https://www.linkedin.com/in/kevinmccabebos/",
};

export interface CaptionKit {
  guest_name: string;
  host_name: string;
  title: string;
  hook: string;
  best_quote: string;
  takeaways?: string[];
  captions?: Captions | null;
  hashtags?: string | null;
  amazon_in_guest_posts?: boolean | null;
  extras?: { spotifyUrl?: string; appleUrl?: string; episodePageUrl?: string; hostLinkedin?: string } | null;
}

/** Strips em/en dashes used as punctuation (house rule). */
export function noDashes(s: string): string {
  return (s || "").replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",");
}

/** The AI/person-editable part of each caption, written in the guest's voice. */
export function defaultBody(kit: CaptionKit, key: PostKey, p: Platform): string {
  const host = kit.host_name;
  const t: Record<PostKey, Record<Platform, string>> = {
    title: {
      li: `${kit.hook}\n\nI joined ${host} on the Profit Streams® Podcast to talk about it: "${kit.title}".`,
      ig: `${kit.hook} 🎧\n\nMy conversation with ${host} on the Profit Streams® Podcast is out now.`,
    },
    summary: {
      li: `${kit.hook}\n\nThat's the big idea from my episode of the Profit Streams® Podcast with ${host}.`,
      ig: `${kit.hook} 💡\n\nThe big idea from my Profit Streams® Podcast episode.`,
    },
    quote: {
      li: `"${kit.best_quote}"\n\nFrom my conversation with ${host} on the Profit Streams® Podcast.`,
      ig: `Said on the Profit Streams® Podcast 👆\n\nMy full conversation with ${host} is out now.`,
    },
    takeaways: {
      li: `10 ideas from my conversation with ${host} on the Profit Streams® Podcast 👇\n\nSwipe through, the full episode is out now.`,
      ig: `10 lessons from my Profit Streams® Podcast episode 🧠 Swipe ➡️ for all 10.`,
    },
    chapters: {
      li: `Everything ${host} and I covered on the Profit Streams® Podcast, timestamped so you can jump to what matters to you.`,
      ig: `Episode breakdown ⏱️ Swipe to see what we covered, minute by minute.`,
    },
  };
  return noDashes(fixBrand(t[key][p]));
}

export function captionBody(kit: CaptionKit, key: PostKey, p: Platform): string {
  const edited = kit.captions?.[key]?.[p];
  return edited && edited.trim() ? edited.trim() : defaultBody(kit, key, p);
}

export function hashtagsOf(kit: CaptionKit): string {
  return (kit.hashtags ?? "").trim() || DEFAULT_HASHTAGS;
}

/** The fixed part added to every caption. */
export function captionFooter(kit: CaptionKit, p: Platform): string {
  const x = kit.extras || {};
  const spotify = x.spotifyUrl?.trim();
  const apple = x.appleUrl?.trim();
  const page = x.episodePageUrl?.trim() || PODCAST_PAGE;
  const amazon = kit.amazon_in_guest_posts !== false;
  const hostKey = (kit.host_name || "").trim().toLowerCase();
  const hostLi = x.hostLinkedin?.trim() || HOST_LINKEDIN[hostKey];
  const lines: string[] = [];

  if (p === "li") {
    if (spotify) lines.push(`🎧 Spotify: ${spotify}`);
    if (apple) lines.push(`🍎 Apple Podcasts: ${apple}`);
    if (!spotify && !apple) lines.push(`🎧 Listen: ${page}`);
    else if (x.episodePageUrl?.trim()) lines.push(`📝 Show notes: ${page}`);
    lines.push(`🔗 Follow Luke Hohmann on LinkedIn: ${LUKE_LINKEDIN}`);
    if (hostKey && hostKey !== "luke hohmann" && hostLi) lines.push(`🎙️ ${kit.host_name}: ${hostLi}`);
  } else {
    // Instagram captions can't hold clickable links, but the text still helps people find it.
    lines.push(`🎧 Search "Profit Streams Podcast" on Spotify or Apple Podcasts`);
    lines.push(`🔗 Follow Luke Hohmann on LinkedIn (linkedin.com/in/lukehohmann)`);
    if (hostKey && hostKey !== "luke hohmann") lines.push(`🎙️ With ${kit.host_name}`);
  }
  if (amazon) {
    lines.push(`📘 Get the #1 best-selling Profit Streams® book: ${BOOK_LINK_TAGGED}`);
    lines.push(AD_LINE);
  }
  return lines.join("\n");
}

/** Full caption, exactly what the guest copies. */
export function fullCaption(kit: CaptionKit, key: PostKey, p: Platform): string {
  const sep = p === "ig" ? "\n.\n.\n" : "\n\n";
  return `${captionBody(kit, key, p)}\n\n${captionFooter(kit, p)}${sep}${hashtagsOf(kit)}`;
}

/** Plain-text file with every caption for one platform (Download all + Drive bundle). */
export function captionsFile(kit: CaptionKit, p: Platform, keys: PostKey[]): string {
  const name = p === "li" ? "LinkedIn" : "Instagram";
  const out = [`${name} captions: ${kit.title}, with ${kit.guest_name}`, `Profit Streams® Podcast`, ""];
  keys.forEach((k) => {
    const post = POSTS.find((x) => x.key === k)!;
    out.push(`==== ${post.label} (images: "${post.file}") ====`, "", fullCaption(kit, k, p), "", "");
  });
  return out.join("\n");
}

/** Which posts a kit actually has images for. */
export function postsWithImages(u: any): PostKey[] {
  const has: Record<PostKey, boolean> = {
    title: !!u?.title_card,
    summary: !!u?.summary_card,
    quote: !!u?.quote_card,
    takeaways: (u?.takeaways || []).length > 0,
    chapters: (u?.chapters || []).length > 0,
  };
  return POSTS.map((p) => p.key).filter((k) => has[k]);
}

/** Images of one post, in order. */
export function postImages(u: any, key: PostKey): string[] {
  if (key === "title") return u?.title_card ? [u.title_card] : [];
  if (key === "summary") return u?.summary_card ? [u.summary_card] : [];
  if (key === "quote") return u?.quote_card ? [u.quote_card] : [];
  if (key === "takeaways") return u?.takeaways || [];
  return u?.chapters || [];
}
