import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { suggestNextSteps, mondayOf } from "@/lib/episodes";
import { listDropFiles } from "@/lib/drive.server";

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

    // Weekly stats (for the check-in reminder)
    const since = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
    const st = await supabase.from("podcast_stats").select("week_of, platform").gte("week_of", since);

    // New Riverside files in the Drive drop folder (skipped quietly if Drive isn't set up yet)
    let dropFiles: { id: string; name: string }[] = [];
    let dropNote: string | null = null;
    if (process.env.DRIVE_DROP_FOLDER_ID) {
      try {
        const files = await listDropFiles();
        const done = await supabase.from("drop_files").select("file_id");
        const seen = new Set((done.data || []).map((r: any) => r.file_id));
        dropFiles = files.filter((f) => !seen.has(f.id));
      } catch (e: any) {
        dropNote = `Couldn't read the Riverside drop folder: ${e.message}`;
      }
    } else {
      dropNote = "Riverside drop folder not connected yet (set DRIVE_DROP_FOLDER_ID in Vercel).";
    }

    const suggestions = suggestNextSteps(ep.data || [], it.data || [], kt.data || [], dr.data || [], new Date(), {
      dropFiles,
      stats: st.error ? undefined : st.data || [],
    });
    return NextResponse.json({ episodes: ep.data, intakes: it.data, kits: kt.data, drafts: dr.data, suggestions, dropNote, week: mondayOf(new Date()) });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Could not load the assistant." }, { status: 500 });
  }
}
