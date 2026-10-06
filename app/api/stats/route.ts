import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Login required. Weekly Spotify + Apple numbers, entered by hand (no official API).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const num = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Math.round(Number(String(v).replace(/[, ]/g, "")));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export async function GET() {
  const { data, error } = await getSupabaseAdmin().from("podcast_stats").select("*").order("week_of", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stats: data || [] });
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.week_of || ""))) return NextResponse.json({ error: "Pick the week." }, { status: 400 });
    if (b.platform !== "spotify" && b.platform !== "apple") return NextResponse.json({ error: "Unknown platform." }, { status: 400 });
    const row = {
      week_of: b.week_of,
      platform: b.platform,
      followers_total: num(b.followers_total),
      plays_7d: num(b.plays_7d),
      latest_episode_plays: num(b.latest_episode_plays),
      notes: String(b.notes || "").slice(0, 500) || null,
      entered_by: String(b.entered_by || "").slice(0, 80) || null,
    };
    if ([row.followers_total, row.plays_7d, row.latest_episode_plays].some((v) => Number.isNaN(v))) {
      return NextResponse.json({ error: "Numbers only, please (no negatives)." }, { status: 400 });
    }
    const { data, error } = await getSupabaseAdmin().from("podcast_stats").upsert(row, { onConflict: "week_of,platform" }).select().single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ row: data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Couldn't save." }, { status: 500 });
  }
}
