import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, guestName, guestEmail, hostName, scheduledAt, createdBy, intakeId } = body;

    // Simple shared-password gate — good enough for a small internal team
    // (Luke, Jason, Laura, Kevin) without building a full login system.
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    if (!guestEmail || !hostName || !scheduledAt) {
      return NextResponse.json(
        { error: "Guest email, host, and scheduled time are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const token = randomBytes(12).toString("hex");

    const { data, error } = await supabase
      .from("recording_sessions")
      .insert({
        token,
        guest_name: guestName || null,
        guest_email: guestEmail,
        host_name: hostName,
        scheduled_at: scheduledAt,
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Session creation failed:", error.message);
      return NextResponse.json({ error: "Could not create session." }, { status: 500 });
    }

    // If this session was created FROM an existing intake submission
    // (the "reversed flow" — guest filled the form first, we schedule after),
    // link that submission to this new session so it drops off the
    // "unscheduled submissions" list.
    if (intakeId) {
      await supabase
        .from("guest_intakes")
        .update({ session_id: data.id })
        .eq("id", intakeId);
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

    return NextResponse.json({
      status: "ok",
      link: `${baseUrl}/session/${token}`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
