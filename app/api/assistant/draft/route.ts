import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hostByKey } from "@/lib/hosts";
import { draftFollowUp } from "@/lib/helpers/followUp";
import { draftPrepBrief } from "@/lib/helpers/prepBrief";
import { GroqRateLimitError } from "@/lib/topicTagger";

// Login required (see middleware.ts). Asks one helper to DRAFT something for
// an episode. Drafts are saved as "draft" — nothing is sent anywhere.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { episode_id, helper } = await req.json();
    if (helper !== "prep_brief" && helper !== "follow_up") {
      return NextResponse.json({ error: "Unknown helper." }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const { data: ep, error: epErr } = await supabase.from("episodes").select("*").eq("id", episode_id).single();
    if (epErr || !ep) return NextResponse.json({ error: "Episode not found." }, { status: 404 });
    if (!ep.intake_id) return NextResponse.json({ error: "This episode has no intake answers to work from." }, { status: 400 });
    const { data: intake, error: inErr } = await supabase.from("guest_intakes").select("*").eq("id", ep.intake_id).single();
    if (inErr || !intake) return NextResponse.json({ error: "Intake not found." }, { status: 404 });

    const host = hostByKey(ep.host_key);
    let draft: { title: string; content: string };
    if (helper === "follow_up") {
      draft = draftFollowUp({ fullName: intake.full_name, email: intake.email }, host);
    } else {
      const { data: past } = await supabase
        .from("media_items")
        .select("title, guest_name, episode_label, summary, topics")
        .eq("kind", "episode")
        .order("created_at", { ascending: false })
        .limit(40);
      draft = await draftPrepBrief(intake, host.name, past || []);
    }

    const { data, error } = await supabase
      .from("agent_drafts")
      .insert({ episode_id: ep.id, helper, title: draft.title, content: draft.content })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ draft: data });
  } catch (e: any) {
    if (e instanceof GroqRateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    console.error(e);
    return NextResponse.json({ error: e.message || "Could not draft that." }, { status: 500 });
  }
}
