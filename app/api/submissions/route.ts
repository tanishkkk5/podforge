import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required (middleware.ts).
// submissions: intake forms not yet linked to a recording (direct sign-ups).
// scheduled:   pre-scheduled recordings ("Schedule Guest") + the guest's form, once they fill it in.
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const [open, sessions, linked] = await Promise.all([
    supabase.from("guest_intakes").select("*").is("session_id", null).order("created_at", { ascending: false }),
    supabase.from("recording_sessions")
      .select("id, token, guest_name, guest_email, host_name, scheduled_at, created_at, created_by")
      .order("scheduled_at", { ascending: false }).limit(100),
    supabase.from("guest_intakes").select("*").not("session_id", "is", null),
  ]);
  if (open.error) {
    return NextResponse.json({ error: "Could not load submissions." }, { status: 500 });
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const scheduled = (sessions.data || []).map((s: any) => ({
    session: { ...s, link: `${origin}/session/${s.token}` },
    intake: (linked.data || []).find((i: any) => i.session_id === s.id) || null,
  }));
  return NextResponse.json({ submissions: open.data, scheduled, scheduledError: sessions.error?.message || null });
}
