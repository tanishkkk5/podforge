import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
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

    // 2. Insert the intake record
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
        book_title: get("bookTitle"),
        on_amazon: get("onAmazon"),
        amazon_link: get("amazonLink"),
        on_audible: get("onAudible"),
        resources: get("resources"),
        topics: get("topics"),
        promo: get("promo"),
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

    // 3. Send notification + confirmation emails via Resend
    // (Skips silently if RESEND_API_KEY isn't set, so local/dev testing
    // doesn't require an email provider to be configured yet.)
    if (process.env.RESEND_API_KEY) {
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
          (get("bookTitle")
            ? `Book: ${get("bookTitle")} (Amazon: ${get("onAmazon")}, Audible: ${get("onAudible")})\n`
            : "No book listed.\n") +
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
