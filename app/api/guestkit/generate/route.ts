import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { extractEpisodeContent } from "@/lib/groq";
import {
  makeTitleCard,
  makeSummaryCard,
  makeQuoteCard,
  makeTakeawaysCarousel,
  makeChaptersCards,
  makeThumbnail,
} from "@/lib/socialAssets";

export const runtime = "nodejs";
export const maxDuration = 60; // image generation for ~15 images can take a bit

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const password = formData.get("password") as string;
    const transcript = formData.get("transcript") as string;
    const guestName = formData.get("guestName") as string;
    const hostName = formData.get("hostName") as string;
    const episodeNumber = formData.get("episodeNumber") as string;
    const chaptersRaw = formData.get("chapters") as string;
    const chapters = chaptersRaw ? JSON.parse(chaptersRaw) : [];

    const headshotFile = formData.get("headshot") as File | null;
    const headshotBuffer =
      headshotFile && headshotFile.size > 0
        ? Buffer.from(await headshotFile.arrayBuffer())
        : null;

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }
    if (!transcript || !guestName || !hostName || !episodeNumber) {
      return NextResponse.json(
        { error: "Transcript, guest name, host name, and episode number are all required." },
        { status: 400 }
      );
    }

    // 1. Extract structured content via Claude (the only paid step)
    const content = await extractEpisodeContent(transcript, guestName, hostName);

    // 2. Generate every image asset (free — pure code)
    const titleBuf = await makeTitleCard(content.title, guestName, hostName, episodeNumber);
    const summaryBuf = await makeSummaryCard(content.hook, content.title, episodeNumber);
    const quoteBuf = await makeQuoteCard(
      content.bestQuote, guestName, content.guestTitle, content.title, episodeNumber, headshotBuffer
    );
    const takeawayBufs = await makeTakeawaysCarousel(content.takeaways, content.title, episodeNumber);
    const parsedChapters = Array.isArray(chapters) ? chapters : [];
    const chapterBufs = parsedChapters.length
      ? await makeChaptersCards(parsedChapters, content.title, episodeNumber)
      : [];
    const thumbnailBuf = await makeThumbnail(content.title, guestName, episodeNumber, headshotBuffer);

    // 3. Upload every image to Supabase Storage
    const supabase = getSupabaseAdmin();
    const slug = `${slugify(guestName)}-ep${episodeNumber}`;

    async function upload(buf: Buffer, name: string): Promise<string> {
      const path = `${slug}/${name}.png`;
      const { error } = await supabase.storage
        .from("guest-kit-assets")
        .upload(path, buf, { contentType: "image/png", upsert: true });
      if (error) throw new Error(`Upload failed for ${name}: ${error.message}`);
      const { data } = supabase.storage.from("guest-kit-assets").getPublicUrl(path);
      return data.publicUrl;
    }

    const titleUrl = await upload(titleBuf, "title_card");
    const summaryUrl = await upload(summaryBuf, "summary_card");
    const quoteUrl = await upload(quoteBuf, "quote_card");
    const thumbnailUrl = await upload(thumbnailBuf, "thumbnail");
    const takeawayUrls = await Promise.all(
      takeawayBufs.map((buf, i) => upload(buf, `takeaway_${i + 1}`))
    );
    const chapterUrls = await Promise.all(
      chapterBufs.map((buf, i) => upload(buf, `chapters_${i + 1}`))
    );

    // 4. Save everything as one row
    const { data: inserted, error: insertError } = await supabase
      .from("guest_kits")
      .insert({
        slug,
        episode_number: episodeNumber,
        guest_name: guestName,
        guest_title: content.guestTitle,
        host_name: hostName,
        title: content.title,
        hook: content.hook,
        summary: content.summary,
        takeaways: content.takeaways,
        chapters: parsedChapters,
        best_quote: content.bestQuote,
        resources: content.resources,
        image_urls: {
          title_card: titleUrl,
          summary_card: summaryUrl,
          quote_card: quoteUrl,
          thumbnail: thumbnailUrl,
          takeaways: takeawayUrls,
          chapters: chapterUrls,
        },
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Database save failed: ${insertError.message}`);
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    return NextResponse.json({
      status: "ok",
      slug,
      url: `${baseUrl}/guestkit/${slug}`,
      content,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
