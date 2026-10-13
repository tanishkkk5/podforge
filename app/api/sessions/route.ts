import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { randomBytes } from "crypto";
import { hasTimeZone } from "@/lib/timezone";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guestName, guestEmail, hostName, scheduledAt, createdBy, intakeId } = body;
    // Optional Riverside studio link — only real https links are kept
    const riverside = typeof body.riverside === "string" && /^https:\/\/\S+$/i.test(body.riverside.trim()) ? body.riverside.trim() : null;
    // Auth is now handled centrally by middleware.ts (session cookie),
    // not a per-request password field.

    if (!guestEmail || !hostName || !scheduledAt) {
      return NextResponse.json(
        { error: "Guest email, host, and scheduled time are required." },
        { status: 400 }
      );
    }

    // A time without a time zone gets stored as UTC — the bug that turned 11:30 into 5:00 PM IST.
    if (!hasTimeZone(String(scheduledAt)) || isNaN(Date.parse(scheduledAt))) {
      return NextResponse.json(
        { error: "The recording time is missing its time zone. Refresh the page and try again." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const token = randomBytes(12).toString("hex");

    const row: Record<string, any> = {
      token,
      guest_name: guestName || null,
      guest_email: guestEmail,
      host_name: hostName,
      scheduled_at: scheduledAt,
      created_by: createdBy || null,
    };
    if (riverside) row.riverside_url = riverside;
    let { data, error } = await supabase.from("recording_sessions").insert(row).select().single();
    // If the riverside_url column hasn't been added yet (migration v16), still create the session
    if (error && riverside && /riverside_url/i.test(error.message)) {
      delete row.riverside_url;
      ({ data, error } = await supabase.from("recording_sessions").insert(row).select().single());
    }

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
