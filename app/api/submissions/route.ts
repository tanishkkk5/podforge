import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("guest_intakes")
    .select("*")
    .is("session_id", null) // only show submissions that haven't been scheduled yet
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load submissions." }, { status: 500 });
  }

  return NextResponse.json({ submissions: data });
}
