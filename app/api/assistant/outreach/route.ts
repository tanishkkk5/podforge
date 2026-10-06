import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { draftOutreach } from "@/lib/helpers/outreach";
import { GroqRateLimitError } from "@/lib/topicTagger";

// Login required (see middleware.ts). Outreach Drafter: saves an invitation
// DRAFT for review. Nothing is sent — Luke's account sends it by hand.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { name, notes } = await req.json();
    const d = await draftOutreach(String(name || ""), String(notes || ""));
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("agent_drafts")
      .insert({ episode_id: null, helper: "outreach", title: d.title, content: d.content })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ draft: data });
  } catch (e: any) {
    if (e instanceof GroqRateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    const userError = /^Add /.test(e.message || "");
    if (!userError) console.error(e);
    return NextResponse.json({ error: e.message || "Could not draft the invitation." }, { status: userError ? 400 : 500 });
  }
}
