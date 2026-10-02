import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { LIST_COLUMNS } from "@/lib/library";
import { cleanTopics } from "@/lib/topics";

// Login required (see middleware.ts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("media_items").select("*").eq("id", params.id).single();
  if (error || !data) return NextResponse.json({ error: error?.message || "Not found." }, { status: 404 });
  return NextResponse.json({ item: data });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const update: Record<string, any> = {};
    for (const k of ["title", "episode_label", "guest_name", "video_url"]) {
      if (typeof b[k] === "string") update[k] = b[k].trim() || (k === "title" ? undefined : null);
    }
    if ("parent_id" in b) update.parent_id = b.parent_id || null;
    if (Array.isArray(b.topics)) {
      update.topics = cleanTopics(b.topics);
      update.tag_status = "edited";
    }
    if (update.title === undefined) delete update.title;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("media_items")
      .update(update)
      .eq("id", params.id)
      .select(LIST_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ item: data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not save." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("media_items").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
