import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isStage } from "@/lib/episodes";

// Login required (see middleware.ts). A person moves an episode forward,
// links its guest kit, or edits its details.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if ("stage" in b) {
      if (!isStage(b.stage)) return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
      update.stage = b.stage;
    }
    for (const k of ["guest_kit_slug", "episode_number", "guest_email", "notes"]) {
      if (typeof b[k] === "string") update[k] = b[k].trim() || null;
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("episodes").update(update).eq("id", params.id).select().single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ episode: data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Could not update the episode." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("episodes").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
