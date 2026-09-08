import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { note } = await req.json();
    const supabase = getSupabaseAdmin();

    const { data: session, error: fetchError } = await supabase
      .from("recording_sessions")
      .select("*")
      .eq("token", params.token)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("recording_sessions")
      .update({ status: "reschedule_requested", reschedule_note: note || null })
      .eq("token", params.token);

    if (updateError) {
      return NextResponse.json({ error: "Could not save request." }, { status: 500 });
    }

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const notifyEmail = process.env.NOTIFY_EMAIL || "tpandey@appliedframeworks.com";
      const fromAddress = process.env.EMAIL_FROM || "Profit Streams Podcast <onboarding@resend.dev>";

      await resend.emails.send({
        from: fromAddress,
        to: notifyEmail,
        subject: `Reschedule requested: ${session.guest_name || session.guest_email}`,
        text:
          `${session.guest_name || session.guest_email} requested a different time for their recording with ${session.host_name}.\n\n` +
          `Originally scheduled: ${session.scheduled_at}\n` +
          `Guest note: ${note || "(no note provided)"}\n\n` +
          `Reply to them directly to arrange a new time, then create a fresh session link.`,
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
