import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { LIST_COLUMNS, tagItem } from "@/lib/library";
import { TOPICS } from "@/lib/topics";

// Login required (see middleware.ts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_TRANSCRIPT_CHARS = 400_000; // ~5+ hours of speech — plenty

// GET /api/library?topic=...&kind=episode|clip&q=search
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const supabase = getSupabaseAdmin();
    let query = supabase.from("media_items").select(LIST_COLUMNS).order("created_at", { ascending: false });

    const topic = sp.get("topic");
    if (topic && (TOPICS as readonly string[]).includes(topic)) query = query.contains("topics", [topic]);
    const kind = sp.get("kind");
    if (kind === "episode" || kind === "clip") query = query.eq("kind", kind);
    const q = (sp.get("q") || "").trim().replace(/[%,()]/g, " ");
    if (q) {
      query = query.or(
        `title.ilike.%${q}%,guest_name.ilike.%${q}%,episode_label.ilike.%${q}%,transcript.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not load the library." }, { status: 500 });
  }
}

// POST /api/library — save one episode or clip, then auto-tag it.
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const kind = b.kind === "clip" ? "clip" : "episode";
    const title = String(b.title || "").trim();
    const transcript = String(b.transcript || "").trim();
    if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });
    if (transcript.length < 20) {
      return NextResponse.json({ error: "The transcript is empty or too short." }, { status: 400 });
    }
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      return NextResponse.json({ error: "That transcript is unusually large — is it the right file?" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: created, error } = await supabase
      .from("media_items")
      .insert({
        kind,
        title,
        transcript,
        episode_label: String(b.episode_label || "").trim() || null,
        guest_name: String(b.guest_name || "").trim() || null,
        parent_id: kind === "clip" && b.parent_id ? String(b.parent_id) : null,
        video_url: String(b.video_url || "").trim() || null,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message || "Could not save.");

    try {
      const result = await tagItem(created.id);
      return NextResponse.json(result);
    } catch (tagErr: any) {
      // Saved fine, tagging failed — the item shows as "failed" with a Retry button.
      const { data } = await supabase.from("media_items").select(LIST_COLUMNS).eq("id", created.id).single();
      return NextResponse.json({ item: data, tagError: tagErr.message });
    }
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not save." }, { status: 500 });
  }
}
