import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Login required. Marks a drop-folder file as processed so it isn't suggested again.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { file_id, name, episode_id } = await req.json();
  if (!file_id) return NextResponse.json({ error: "Missing file id." }, { status: 400 });
  const { error } = await getSupabaseAdmin()
    .from("drop_files")
    .upsert({ file_id: String(file_id), name: String(name || ""), episode_id: episode_id || null }, { onConflict: "file_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
