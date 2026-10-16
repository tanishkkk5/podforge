import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { extractEpisodeContent } from "@/lib/groq";
import { detectFrameworks, frameworkResources } from "@/lib/frameworks";
import { fixTranscript } from "@/lib/transcriptFixes";
import { fetchHeadshot, renderKitImages } from "@/lib/kitImages.server";
import { candidatesFor, verifyQuote } from "@/lib/quotePicker.server";
import { abbreviationsIn } from "@/lib/quotes";
import { noDashes } from "@/lib/guestCaptions";

// Login required (middleware.ts). Step 1 of the Episode Studio (decision 0016):
// transcript + guest (usually picked from their intake form) → draft episode content + images.
export const runtime = "nodejs";
export const maxDuration = 60;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const MIGRATION_HINT = "Run supabase/migration_v17.sql in Supabase → SQL Editor, then try again.";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const get = (k: string) => String(formData.get(k) || "").trim();
    const transcript = fixTranscript(get("transcript")).text;
    const guestName = get("guestName");
    const hostName = get("hostName");
    const episodeNumber = get("episodeNumber").replace(/^ep-?/i, "");
    const intakeId = get("intakeId") || null;
    let chapters: { time: string; title: string }[] = [];
    try { chapters = JSON.parse(get("chapters") || "[]"); } catch { chapters = []; }
    if (!Array.isArray(chapters)) chapters = [];

    if (!transcript || !guestName || !hostName || !episodeNumber) {
      return NextResponse.json({ error: "Transcript, guest name, host name, and episode number are all required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Headshot: an uploaded file wins, else the photo from the guest's intake form
    const headshotFile = formData.get("headshot") as File | null;
    let headshotUrl: string | null = get("headshotUrl") || null;
    let headshot: Buffer | null = null;
    const slug = `${slugify(guestName)}-ep${episodeNumber}`;
    if (headshotFile && headshotFile.size > 0) {
      headshot = Buffer.from(await headshotFile.arrayBuffer());
      const path = `${slug}/headshot`;
      const up = await supabase.storage.from("guest-kit-assets").upload(path, headshot, { contentType: headshotFile.type || "image/jpeg", upsert: true });
      if (!up.error) headshotUrl = supabase.storage.from("guest-kit-assets").getPublicUrl(path).data.publicUrl;
    } else {
      headshot = await fetchHeadshot(headshotUrl);
    }

    // 1. AI draft (free Groq tier)
    // Long episodes arrive with notes from every part (decision 0019), so the whole conversation is used.
    const digest = get("digest");
    const content = await extractEpisodeContent(transcript, guestName, hostName, digest || undefined);
    content.title = noDashes(content.title);
    content.hook = noDashes(content.hook);
    content.summary = noDashes(content.summary);
    content.takeaways = content.takeaways.map(noDashes);
    const guestTitle = get("guestTitle") || content.guestTitle;

    // 2. Images (title, big idea, quote, 10 takeaways, chapters)
    // Real quotes only (decision 0020): match the AI's pick to the guest's actual words + time.
    const quoteCheck = { transcript, guest_name: guestName, host_name: hostName };
    const real = verifyQuote(quoteCheck, content.bestQuote);
    const hasCandidates = candidatesFor(quoteCheck).length > 0;
    if (real) content.bestQuote = real.text;
    const quoteTime = real?.time || "";

    const image_urls = await renderKitImages(
      { slug, episode_number: episodeNumber, guest_name: guestName, guest_title: guestTitle, host_name: hostName,
        title: content.title, hook: content.hook, best_quote: content.bestQuote, takeaways: content.takeaways, chapters, quote_time: quoteTime },
      headshot
    );

    // 3. Keep links already typed on an earlier run; fill guest links from the intake form
    const { data: existing } = await supabase.from("guest_kits").select("extras").eq("slug", slug).maybeSingle();
    const extras: Record<string, any> = { ...(existing?.extras || {}) };
    extras.quoteTime = quoteTime;
    extras.quoteNeedsPick = !real && hasCandidates ? "yes" : "";
    extras.explainerTerm = abbreviationsIn(content.bestQuote)[0] || "";
    delete extras.explainer;
    extras.usedQuotes = [];
    if (!extras.guestLinkedin && get("guestLinkedin")) extras.guestLinkedin = get("guestLinkedin");
    if (!extras.guestOtherLinks && get("guestOtherLinks")) extras.guestOtherLinks = get("guestOtherLinks");
    if (digest) extras.digest = digest.slice(0, 20000); else delete extras.digest;

    const { error: insertError } = await supabase
      .from("guest_kits")
      .upsert(
        {
          slug,
          episode_number: episodeNumber,
          guest_name: guestName,
          guest_title: guestTitle,
          host_name: hostName,
          title: content.title,
          hook: content.hook,
          summary: content.summary,
          takeaways: content.takeaways,
          chapters,
          best_quote: content.bestQuote,
          topics: content.topics,
          takeaway_topics: content.takeawayTopics,
          resources: [...frameworkResources(detectFrameworks(transcript)), ...(content.resources || [])],
          image_urls,
          extras,
          transcript,
          headshot_url: headshotUrl,
          intake_id: intakeId,
          captions: {}, // fresh content → fresh default captions
          updated_at: new Date().toISOString(),
          status: "draft", // decision 0009: a person approves
          reviewed_by: null,
          reviewed_at: null,
        },
        { onConflict: "slug" }
      );
    if (insertError) {
      const hint = /column .* does not exist|could not find .* column/i.test(insertError.message) ? ` ${MIGRATION_HINT}` : "";
      throw new Error(`Database save failed: ${insertError.message}.${hint}`);
    }

    // Link the episode tracker row (Production Assistant), if there is one for this intake
    if (intakeId) {
      await supabase.from("episodes").update({ guest_kit_slug: slug, episode_number: episodeNumber })
        .eq("intake_id", intakeId).is("guest_kit_slug", null);
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    return NextResponse.json({ status: "ok", slug, url: `${baseUrl}/guestkit/${slug}`, content });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Something went wrong." }, { status: 500 });
  }
}
