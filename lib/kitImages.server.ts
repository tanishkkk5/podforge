/**
 * Renders every guest kit image from the kit's CURRENT text and uploads it to
 * Supabase Storage (bucket guest-kit-assets). Used when a kit is generated and
 * again whenever someone edits the title, takeaways, quote or chapters.
 * The episode thumbnail is NOT made here any more: it's made in Canva (decision 0016).
 */
import { getSupabaseAdmin } from "./supabase";
import { makeTitleCard, makeSummaryCard, makeQuoteCard, makeTakeawaysCarousel, makeChaptersCards, makeExplainerCard } from "./socialAssets";
import { fixBrand } from "./showNotes";
import { stripMarks } from "./textStyle";

export interface KitImageInput {
  slug: string;
  episode_number: string;
  guest_name: string;
  guest_title: string;
  host_name: string;
  title: string;
  hook: string;
  best_quote: string;
  takeaways: string[];
  chapters: { time: string; title: string }[];
  quote_time?: string | null;
  explainer?: { term: string; kind: "abbr" | "tech"; meaning: string; example: string; include?: boolean } | null;
}

export interface KitImageUrls {
  title_card: string;
  summary_card: string;
  quote_card: string;
  takeaways: string[];
  chapters: string[];
  explainer_card?: string;
}

/** Downloads a headshot (intake form or upload) as a Buffer; null if it can't be read. */
export async function fetchHeadshot(url: string | null | undefined): Promise<Buffer | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (type && !type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 && buf.length < 15_000_000 ? buf : null;
  } catch {
    return null;
  }
}

/** Everything the images need, from a guest_kits row (quote time + explainer live in extras). */
export function kitImageInput(kit: any): KitImageInput {
  return {
    slug: kit.slug, episode_number: kit.episode_number, guest_name: kit.guest_name, guest_title: kit.guest_title || "",
    host_name: kit.host_name, title: kit.title, hook: kit.hook || "", best_quote: kit.best_quote || "",
    takeaways: kit.takeaways || [], chapters: kit.chapters || [],
    quote_time: kit.extras?.quoteTime || null, explainer: kit.extras?.explainer || null,
  };
}

export async function renderKitImages(k: KitImageInput, headshot: Buffer | null): Promise<KitImageUrls> {
  const ep = String(k.episode_number || "").replace(/^ep-?/i, "");
  const title = fixBrand(stripMarks(k.title));
  const titleBuf = await makeTitleCard(title, k.guest_name, k.host_name, ep);
  const summaryBuf = await makeSummaryCard(fixBrand(stripMarks(k.hook)), title, ep);
  const ex = k.explainer && k.explainer.include !== false && k.explainer.term ? k.explainer : null;
  const swipe = ex ? (ex.kind === "tech" ? `Swipe: what is ${ex.term}?` : `Swipe: what does ${ex.term} mean?`) : null;
  const quoteBuf = await makeQuoteCard(fixBrand(stripMarks(k.best_quote)), k.guest_name, k.guest_title || "", title, ep, headshot, k.quote_time || null, swipe);
  const explainerBuf = ex ? await makeExplainerCard(ex.term, ex.kind, ex.meaning, ex.example, k.guest_name, ep, k.quote_time || null) : null;
  const takeawayBufs = await makeTakeawaysCarousel(k.takeaways.map(fixBrand), title, ep);
  const chapterBufs = k.chapters?.length ? await makeChaptersCards(k.chapters, title, ep) : [];

  const supabase = getSupabaseAdmin();
  const v = Date.now(); // cache-buster: same file path, new version after every rebuild
  async function upload(buf: Buffer, name: string): Promise<string> {
    const path = `${k.slug}/${name}.png`;
    const { error } = await supabase.storage.from("guest-kit-assets").upload(path, buf, { contentType: "image/png", upsert: true });
    if (error) throw new Error(`Upload failed for ${name}: ${error.message}`);
    return `${supabase.storage.from("guest-kit-assets").getPublicUrl(path).data.publicUrl}?v=${v}`;
  }

  // Remove leftover chapter slides from an earlier, longer version
  const { data: old } = await supabase.storage.from("guest-kit-assets").list(k.slug);
  const stale = (old || [])
    .map((f) => f.name)
    .filter((n) => /^chapters_(\d+)\.png$/.test(n) && Number(n.match(/\d+/)![0]) > chapterBufs.length);
  if (stale.length) await supabase.storage.from("guest-kit-assets").remove(stale.map((n) => `${k.slug}/${n}`));

  return {
    title_card: await upload(titleBuf, "title_card"),
    summary_card: await upload(summaryBuf, "summary_card"),
    quote_card: await upload(quoteBuf, "quote_card"),
    ...(explainerBuf ? { explainer_card: await upload(explainerBuf, "explainer_card") } : {}),
    takeaways: await Promise.all(takeawayBufs.map((b, i) => upload(b, `takeaway_${i + 1}`))),
    chapters: await Promise.all(chapterBufs.map((b, i) => upload(b, `chapters_${i + 1}`))),
  };
}
