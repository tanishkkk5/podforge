import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hostByKey } from "@/lib/hosts";

// Login required (see middleware.ts). Start tracking an episode — from an
// intake submission (intake_id) or by hand (guest_name).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const supabase = getSupabaseAdmin();
    let row: Record<string, any>;
    if (b.intake_id) {
      const { data: intake, error } = await supabase
        .from("guest_intakes").select("id, full_name, email, host").eq("id", b.intake_id).single();
      if (error || !intake) return NextResponse.json({ error: "Intake not found." }, { status: 404 });
      const { data: existing } = await supabase.from("episodes").select("id").eq("intake_id", intake.id);
      if (existing && existing.length) return NextResponse.json({ error: "This intake is already tracked." }, { status: 409 });
      row = { guest_name: intake.full_name, guest_email: intake.email, host_key: hostByKey(intake.host).key, intake_id: intake.id };
    } else {
      const name = String(b.guest_name || "").trim();
      if (!name) return NextResponse.json({ error: "A guest name is required." }, { status: 400 });
      row = { guest_name: name, guest_email: String(b.guest_email || "").trim() || null, host_key: hostByKey(b.host_key).key };
    }
    if (b.episode_number) row.episode_number = String(b.episode_number).trim();
    const { data, error } = await supabase.from("episodes").insert(row).select().single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ episode: data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Could not create the episode." }, { status: 500 });
  }
}
