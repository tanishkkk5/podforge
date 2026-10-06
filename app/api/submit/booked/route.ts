import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// PUBLIC (called from the guest's thank-you page after HubSpot reports a
// successful booking). Kept safe on purpose: it can only stamp booked_at,
// only once, and only on a submission made in the last 3 hours.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id || typeof id !== "string") return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("guest_intakes")
      .update({ booked_at: new Date().toISOString() })
      .eq("id", id)
      .is("booked_at", null)
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("Booking mark failed:", err);
    // Never show the guest an error for this — their meeting is booked in HubSpot either way.
    return NextResponse.json({ status: "ignored" });
  }
}
