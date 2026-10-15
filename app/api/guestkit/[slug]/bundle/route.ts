import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  createEpisodeFolders, episodeFolderName, findOrCreateFolder, folderIdFromLink,
  shareAnyoneCanView, upsertImage, upsertText,
} from "@/lib/drive.server";
import { kitPackageFiles, readme } from "@/lib/kitPackage.server";
import { captionsFile, hashtagsOf, PODCAST_PAGE, postsWithImages } from "@/lib/guestCaptions";

// Login required (middleware.ts). Builds the guest's Drive bundle (project standard):
//   Guest Bundle/0 START HERE · 1 Posts · 2 Clips · 3 Thumbnail · 4 Audio & Transcript
// Fills START HERE, the posts + captions and the transcript automatically.
// 2 Clips, 3 Thumbnail and the audio are dropped in by a person (links come back).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: kit, error } = await supabase.from("guest_kits").select("*").eq("slug", params.slug).single();
    if (error || !kit) return NextResponse.json({ error: "Guest kit not found." }, { status: 404 });

    // 1. Episode folder (pasted link → tracked episode → new standard folder)
    let episodeFolderId = folderIdFromLink(kit.extras?.driveFolder || "");
    if (!episodeFolderId) {
      const { data: ep } = await supabase.from("episodes").select("drive_folder_id").eq("guest_kit_slug", kit.slug).maybeSingle();
      episodeFolderId = ep?.drive_folder_id || null;
    }
    if (!episodeFolderId) {
      episodeFolderId = (await createEpisodeFolders(episodeFolderName(kit.host_name, kit.guest_name, kit.episode_number))).id;
    }

    // 2. Bundle structure
    const bundle = await findOrCreateFolder("Guest Bundle", episodeFolderId);
    const start = await findOrCreateFolder("0 START HERE", bundle.id);
    const posts = await findOrCreateFolder("1 Posts", bundle.id);
    const clips = await findOrCreateFolder("2 Clips", bundle.id);
    const thumb = await findOrCreateFolder("3 Thumbnail", bundle.id);
    const audio = await findOrCreateFolder("4 Audio & Transcript", bundle.id);

    // 3. Posts: images + caption files
    const failed: string[] = [];
    let images = 0;
    for (const f of kitPackageFiles(kit)) {
      if (!f.url) continue;
      try {
        const res = await fetch(f.url);
        if (!res.ok) throw new Error(String(res.status));
        await upsertImage(f.path.replace(/^Posts\//, ""), Buffer.from(await res.arrayBuffer()), posts.id);
        images++;
      } catch {
        failed.push(f.path);
      }
    }
    const keys = postsWithImages(kit.image_urls);
    await upsertText("Captions - LinkedIn.txt", captionsFile(kit, "li", keys), posts.id);
    await upsertText("Captions - Instagram.txt", captionsFile(kit, "ig", keys), posts.id);

    // 4. Transcript
    if (kit.transcript) await upsertText(`Transcript - EP-${kit.episode_number} ${kit.guest_name}`, kit.transcript, audio.id, true);

    // 5. START HERE (Google Doc)
    const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    const x = kit.extras || {};
    const links = [
      `Your guest kit page: ${origin}/guestkit/${kit.slug}`,
      x.episodePageUrl ? `Episode page: ${x.episodePageUrl}` : `Podcast page: ${PODCAST_PAGE}`,
      x.spotifyUrl && `Spotify: ${x.spotifyUrl}`,
      x.appleUrl && `Apple Podcasts: ${x.appleUrl}`,
      x.lukePostUrl && `Luke's LinkedIn post (please like and reshare): ${x.lukePostUrl}`,
      `Luke Hohmann on LinkedIn: https://www.linkedin.com/in/lukehohmann/`,
    ].filter(Boolean).join("\n");
    const startText = `${readme(kit, keys.length)}
LINKS
${links}

FOLDERS
1 Posts: the images + caption files
2 Clips: 3 short video clips from the episode, great for LinkedIn and Instagram Reels
3 Thumbnail: the episode cover art
4 Audio & Transcript: the full episode audio and transcript

HASHTAGS
${hashtagsOf(kit)}

LINKEDIN CAPTIONS
${captionsFile(kit, "li", keys)}

INSTAGRAM CAPTIONS
${captionsFile(kit, "ig", keys)}`;
    const startDoc = await upsertText("START HERE", startText, start.id, true);

    // 6. View link for the guest
    const shared = await shareAnyoneCanView(bundle.id);

    const extras = {
      ...x,
      driveFolder: x.driveFolder || `https://drive.google.com/drive/folders/${episodeFolderId}`,
      guestBundleUrl: bundle.url,
      bundlePostsUrl: posts.url,
      bundleClipsUrl: clips.url,
      bundleThumbUrl: thumb.url,
      bundleAudioUrl: audio.url,
    };
    await supabase.from("guest_kits").update({ extras }).eq("slug", kit.slug);

    return NextResponse.json({
      bundleUrl: bundle.url, startUrl: startDoc.url, postsUrl: posts.url, clipsUrl: clips.url, thumbUrl: thumb.url, audioUrl: audio.url,
      images, failed, shared,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: `Couldn't build the Drive bundle: ${e.message}` }, { status: 500 });
  }
}
