import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { suggestNextSteps } from "@/lib/episodes";

// Login required (see middleware.ts). Everything the Production Assistant
// dashboard shows, plus the agent's suggestions — worked out fresh on every
// visit (no scheduled jobs; decision 0013).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const [ep, it, kt, dr] = await Promise.all([
      supabase.from("episodes").select("*").order("created_at", { ascending: false }),
      supabase.from("guest_intakes").select("id, created_at, full_name, email, host, booked_at, session_id").order("created_at", { ascending: false }),
      supabase.from("guest_kits").select("slug, guest_name, episode_number, status"),
      supabase.from("agent_drafts").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    const err = ep.error || it.error || kt.error || dr.error;
    if (err) throw new Error(err.message);
    const suggestions = suggestNextSteps(ep.data || [], it.data || [], kt.data || [], dr.data || []);
    return NextResponse.json({ episodes: ep.data, intakes: it.data, kits: kt.data, drafts: dr.data, suggestions });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Could not load the assistant." }, { status: 500 });
  }
}
