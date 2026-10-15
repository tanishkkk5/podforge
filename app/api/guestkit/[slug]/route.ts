import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { reviewUpdate } from "@/lib/review";
import { cleanTopics } from "@/lib/topics";

// Login required (see middleware.ts). Read one kit, or save its
// resource links + show-notes extras.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXTRA_KEYS = ["driveFolder", "episodePageUrl", "guestLinkedin", "guestOtherLinks", "hostLinkedin", "spotifyUrl", "appleUrl", "relatedEpisode", "lukePostUrl", "afPostUrl"];
// Set by the server (Drive bundle / images); kept when the page saves extras
const SERVER_EXTRA_KEYS = ["driveImagesFolder", "guestBundleUrl", "bundlePostsUrl", "bundleClipsUrl", "bundleThumbUrl", "bundleAudioUrl"];
const POST_KEYS = ["title", "summary", "quote", "takeaways", "chapters"];
const str = (v: unknown, max = 5000) => String(v ?? "").replace(/\s*[\u2014\u2013]\s*/g, ", ").trim().slice(0, max);

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("guest_kits").select("*").eq("slug", params.slug).single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Guest kit not found." }, { status: 404 });
    }
    return NextResponse.json({ kit: data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not load guest kit." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const body = await req.json();

    const resources = Array.isArray(body.resources)
      ? body.resources
          .filter((r: any) => r && typeof r.label === "string" && r.label.trim())
          .map((r: any) => ({
            label: String(r.label).trim(),
            type: String(r.type || "other").trim(),
            url: String(r.url || "").trim(),
          }))
      : undefined;

    const supabase = getSupabaseAdmin();
    const { data: current } = await supabase.from("guest_kits").select("status, extras").eq("slug", params.slug).single();

    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    // Only touch extras when they were sent (an approve-only request must not wipe them)
    if (body.extras && typeof body.extras === "object") {
      const extras: Record<string, string> = {};
      for (const k of SERVER_EXTRA_KEYS) if (current?.extras?.[k]) extras[k] = current.extras[k];
      for (const k of EXTRA_KEYS) {
        if (typeof body.extras[k] === "string") extras[k] = body.extras[k];
      }
      update.extras = extras;
    }

    // Episode content (Episode Studio, decision 0016). Locked once approved:
    // the approved kit is final; move it back to draft to change it.
    const content: Record<string, any> = {};
    if (typeof body.title === "string") content.title = str(body.title, 120);
    if (typeof body.hook === "string") content.hook = str(body.hook, 400);
    if (typeof body.summary === "string") content.summary = str(body.summary, 2000);
    if (typeof body.best_quote === "string") content.best_quote = str(body.best_quote, 400);
    if (typeof body.guest_title === "string") content.guest_title = str(body.guest_title, 120);
    if (typeof body.episode_number === "string") content.episode_number = str(body.episode_number, 10).replace(/^ep-?/i, "");
    if (Array.isArray(body.takeaways)) {
      const t = body.takeaways.map((x: unknown) => str(x, 400)).filter(Boolean);
      if (t.length !== 10) return NextResponse.json({ error: `Keep exactly 10 takeaways (you have ${t.length}).` }, { status: 400 });
      content.takeaways = t;
    }
    if (Array.isArray(body.chapters)) {
      content.chapters = body.chapters
        .filter((c: any) => c && /^\d{1,2}:\d{2}(:\d{2})?$/.test(String(c.time || "").trim()) && String(c.title || "").trim())
        .map((c: any) => ({ time: String(c.time).trim(), title: str(c.title, 160) }));
    }
    if (body.captions && typeof body.captions === "object") {
      const caps: Record<string, Record<string, string>> = {};
      for (const k of POST_KEYS) {
        const c = body.captions[k];
        if (!c || typeof c !== "object") continue;
        caps[k] = {};
        for (const p of ["li", "ig"]) if (typeof c[p] === "string" && c[p].trim()) caps[k][p] = str(c[p], 3000);
      }
      content.captions = caps;
    }
    if (typeof body.hashtags === "string") content.hashtags = str(body.hashtags, 300);
    if (typeof body.amazon_in_guest_posts === "boolean") content.amazon_in_guest_posts = body.amazon_in_guest_posts;
    if (Object.keys(content).length && current?.status === "approved" && body.review !== "unapprove") {
      return NextResponse.json({ error: "This kit is approved, so it's final. Move it back to draft to edit it." }, { status: 409 });
    }
    Object.assign(update, content);
    if (resources) update.resources = resources;

    if (Array.isArray(body.topics)) update.topics = cleanTopics(body.topics).slice(0, 3);
    if (Array.isArray(body.takeaway_topics)) {
      update.takeaway_topics = body.takeaway_topics.map((t: unknown) => cleanTopics([t])[0] || null);
    }

    const review = reviewUpdate(body);
    if (review.error) return NextResponse.json({ error: review.error }, { status: 400 });
    Object.assign(update, review.update || {});

    const { data, error } = await supabase
      .from("guest_kits")
      .update(update)
      .eq("slug", params.slug)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ kit: data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not save guest kit." }, { status: 500 });
  }
}
