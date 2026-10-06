import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createEpisodeFolders, episodeFolderName } from "@/lib/drive.server";
import { hostByKey } from "@/lib/hosts";

// Login required. Creates the standard episode folder (+ Main Podcast, Magic Clips).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { episode_id } = await req.json();
    const supabase = getSupabaseAdmin();
    const { data: ep } = await supabase.from("episodes").select("*").eq("id", episode_id).single();
    if (!ep) return NextResponse.json({ error: "Episode not found." }, { status: 404 });
    if (ep.drive_folder_id) return NextResponse.json({ error: "This episode already has Drive folders." }, { status: 409 });
    const folder = await createEpisodeFolders(episodeFolderName(hostByKey(ep.host_key).name, ep.guest_name, ep.episode_number));
    await supabase.from("episodes").update({ drive_folder_id: folder.id, updated_at: new Date().toISOString() }).eq("id", ep.id);
    return NextResponse.json({ folder });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: `Couldn't create the Drive folders: ${e.message}` }, { status: 500 });
  }
}
