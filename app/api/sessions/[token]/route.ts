import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("recording_sessions")
    .select("*")
    .eq("token", params.token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ session: data });
}
