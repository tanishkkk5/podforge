import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Login required (see middleware.ts). Saves a draft that was put together in
// the browser (the Clip Finder's results) so it can be reviewed and approved.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["clip_finder"];

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!ALLOWED.includes(b.helper)) return NextResponse.json({ error: "Unknown helper." }, { status: 400 });
    const content = String(b.content || "").trim();
    if (!content) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("agent_drafts")
      .insert({
        episode_id: b.episode_id || null,
        helper: b.helper,
        title: String(b.title || "Draft").slice(0, 200),
        content: content.slice(0, 20000),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ draft: data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Could not save the draft." }, { status: 500 });
  }
}
