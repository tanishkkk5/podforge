import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Login required (see middleware.ts). Lists every generated guest kit.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("guest_kits")
      .select("slug, episode_number, guest_name, host_name, title, created_at, resources, extras, status, reviewed_by, reviewed_at, topics")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ kits: data || [] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not load guest kits." }, { status: 500 });
  }
}
