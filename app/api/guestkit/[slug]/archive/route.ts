import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { archiveEpisode } from "@/lib/archive.server";

// Login required (middleware.ts). Adds the episode's Lenny-style summary + transcript to Ask Archive.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: kit, error } = await supabase.from("guest_kits").select("*").eq("slug", params.slug).single();
    if (error || !kit) return NextResponse.json({ error: "Guest kit not found." }, { status: 404 });
    const r = await archiveEpisode(kit);
    return NextResponse.json({ ...r, transcriptMissing: !kit.transcript });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: `Couldn't add to Ask Archive: ${e.message}` }, { status: 500 });
  }
}
