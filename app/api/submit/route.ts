import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { appendGuestRow } from "@/lib/googleSheets";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const get = (key: string) => (formData.get(key) as string) || "";

    const fullName = get("fullName");
    const email = get("email");

    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Full name and email are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Upload headshot to Supabase Storage, if one was attached
    let headshotUrl = get("headshotLink") || null;
    const headshotFile = formData.get("headshotFile") as File | null;

    if (headshotFile && headshotFile.size > 0) {
      const bytes = await headshotFile.arrayBuffer();
      const ext = headshotFile.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${fullName.replace(/[^a-zA-Z0-9]/g, "")}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("headshots")
        .upload(path, Buffer.from(bytes), {
          contentType: headshotFile.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        console.error("Headshot upload failed:", uploadError.message);
        // Don't fail the whole submission over a headshot upload issue —
        // the rest of the intake data still matters.
      } else {
        const { data: publicUrlData } = supabase.storage
          .from("headshots")
          .getPublicUrl(path);
        headshotUrl = publicUrlData.publicUrl;
      }
    }

    // 2. Parse the books array (multiple books now supported)
    let books: Array<{ title: string; onAmazon: string; amazonLink: string; onAudible: string }> = [];
    try {
      books = JSON.parse(get("books") || "[]");
    } catch {
      books = [];
    }

    // 2a. If a scheduling token was passed, look up its session id
    let sessionId: string | null = null;
    const token = get("token");
    if (token) {
      const { data: sessionRow } = await supabase
        .from("recording_sessions")
        .select("id")
        .eq("token", token)
        .single();
      if (sessionRow) sessionId = sessionRow.id;
    }

    // 3. Insert the intake record
    const { data: inserted, error: insertError } = await supabase
      .from("guest_intakes")
      .insert({
        full_name: fullName,
        email,
        role: get("role"),
        company: get("company"),
        short_bio: get("shortBio"),
        long_bio: get("longBio"),
        headshot_url: headshotUrl,
        site_biz: get("siteBiz"),
        site_personal: get("sitePersonal"),
        linkedin: get("linkedin"),
        other_links: get("otherLinks"),
        books: books, // jsonb column — see schema update
        resources: get("resources"),
        topics: get("topics"),
        promo: get("promo"),
        session_id: sessionId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert failed:", insertError.message);
      return NextResponse.json(
        { error: "Could not save your submission. Please try again." },
        { status: 500 }
      );
    }

    // 2b. If this came from a scheduled session, mark it as intake_submitted
    if (sessionId) {
      await supabase
        .from("recording_sessions")
        .update({ status: "intake_submitted" })
        .eq("id", sessionId);
    }

    // 2c. Add a row to the Drive-based Guest List sheet (no-ops if not configured)
    try {
      await appendGuestRow([
        new Date().toISOString().slice(0, 10), // date
        fullName,
        email,
        get("company"),
        books.map((b) => b.title).join(", ") || "—",
        get("role"),
        sessionId ? "Via scheduled session" : "Direct submission",
        "New", // status column — update manually as the guest kit progresses
      ]);
    } catch (sheetErr) {
      console.error("Guest List sheet update failed (non-fatal):", sheetErr);
      // Don't fail the whole submission over a Sheets issue — the
      // database record is already saved regardless.
    }

    // 3. Send notification + confirmation emails via Resend
    // (Skips silently if RESEND_API_KEY isn't set, so local/dev testing
    // doesn't require an email provider to be configured yet. Wrapped in
    // its own try/catch — Resend's free tier only allows sending to your
    // own verified address unless you add a custom domain, so a test
    // submission using a different email would otherwise crash the whole
    // request. A failed email should never lose the guest's actual data.)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const notifyEmail = process.env.NOTIFY_EMAIL || "tpandey@appliedframeworks.com";
        const fromAddress = process.env.EMAIL_FROM || "Profit Streams Podcast <onboarding@resend.dev>";

        await resend.emails.send({
          from: fromAddress,
          to: notifyEmail,
          subject: `New Guest Intake Submitted: ${fullName}`,
          text:
            `${fullName} just submitted the guest intake form.\n\n` +
            `Email: ${email}\n` +
            `Company: ${get("company")}\n` +
            (books.length > 0
              ? `Books:\n` + books.map((b) => `- ${b.title} (Amazon: ${b.onAmazon}, Audible: ${b.onAudible})`).join("\n") + "\n"
              : "No books listed.\n") +
            `Headshot: ${headshotUrl || "Not provided"}\n` +
            `Record ID: ${inserted.id}`,
        });

        await resend.emails.send({
          from: fromAddress,
          to: email,
          subject: "Thanks — you're all set for the Profit Streams® Podcast!",
          text:
            `Hi ${fullName.split(" ")[0]},\n\n` +
            `Thanks for sending over your info ahead of the recording — it's all set on our end.\n\n` +
            `Looking forward to the conversation!\n\n` +
            `Best,\nApplied Frameworks · Profit Streams® Podcast`,
        });
      } catch (emailErr) {
        console.error("Email send failed (non-fatal):", emailErr);
        // Same principle as the Sheets integration above — a failed email
        // (e.g. Resend sandbox restrictions on unverified domains) should
        // never cause the guest's actual submission to be lost.
      }
    }

    return NextResponse.json({ status: "ok", id: inserted.id });
  } catch (err) {
    console.error("Submission error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
