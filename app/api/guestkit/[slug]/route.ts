import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { reviewUpdate } from "@/lib/review";
import { cleanTopics } from "@/lib/topics";

// Login required (see middleware.ts). Read one kit, or save its
// resource links + show-notes extras.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXTRA_KEYS = ["guestLinkedin", "guestOtherLinks", "hostLinkedin", "spotifyUrl", "appleUrl", "relatedEpisode"];

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

    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    // Only touch extras when they were sent (an approve-only request must not wipe them)
    if (body.extras && typeof body.extras === "object") {
      const extras: Record<string, string> = {};
      for (const k of EXTRA_KEYS) {
        if (typeof body.extras[k] === "string") extras[k] = body.extras[k];
      }
      update.extras = extras;
    }
    if (resources) update.resources = resources;

    if (Array.isArray(body.topics)) update.topics = cleanTopics(body.topics).slice(0, 3);
    if (Array.isArray(body.takeaway_topics)) {
      update.takeaway_topics = body.takeaway_topics.map((t: unknown) => cleanTopics([t])[0] || null);
    }

    const review = reviewUpdate(body);
    if (review.error) return NextResponse.json({ error: review.error }, { status: 400 });
    Object.assign(update, review.update || {});

    const supabase = getSupabaseAdmin();
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
