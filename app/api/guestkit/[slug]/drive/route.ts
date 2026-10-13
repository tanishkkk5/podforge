import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createEpisodeFolders, episodeFolderName, findOrCreateFolder, folderIdFromLink, upsertImage } from "@/lib/drive.server";

// Login required (middleware.ts). Saves every image of a guest kit into the
// episode's Google Drive folder, in a "Promotion Images" subfolder.
// Which episode folder: (1) the link pasted in the kit's "Episode folder in Google Drive"
// field, else (2) the Drive folder of the tracked episode in Production Assistant,
// else (3) a new standard episode folder is created under the podcast root.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: kit, error } = await supabase.from("guest_kits").select("*").eq("slug", params.slug).single();
    if (error || !kit) return NextResponse.json({ error: "Guest kit not found." }, { status: 404 });

    // 1. Which episode folder?
    let episodeFolderId = folderIdFromLink(kit.extras?.driveFolder || "");
    if (!episodeFolderId) {
      const { data: ep } = await supabase.from("episodes").select("drive_folder_id").eq("guest_kit_slug", kit.slug).maybeSingle();
      episodeFolderId = ep?.drive_folder_id || null;
    }
    let createdEpisodeFolder = false;
    if (!episodeFolderId) {
      const made = await createEpisodeFolders(episodeFolderName(kit.host_name, kit.guest_name, kit.episode_number));
      episodeFolderId = made.id;
      createdEpisodeFolder = true;
    }

    // 2. Subfolder for the images
    const target = await findOrCreateFolder("Promotion Images", episodeFolderId);

    // 3. Copy every kit image into it
    const ep = kit.episode_number ? `EP-${String(kit.episode_number).replace(/^ep-?/i, "")} ` : "";
    const imgs: { name: string; url: string }[] = [];
    const u = kit.image_urls || {};
    if (u.title_card) imgs.push({ name: `${ep}1 Title Card.png`, url: u.title_card });
    if (u.summary_card) imgs.push({ name: `${ep}2 Summary Card.png`, url: u.summary_card });
    if (u.quote_card) imgs.push({ name: `${ep}3 Quote Card.png`, url: u.quote_card });
    (u.takeaways || []).forEach((url: string, i: number) => imgs.push({ name: `${ep}4 Takeaway ${String(i + 1).padStart(2, "0")}.png`, url }));
    (u.chapters || []).forEach((url: string, i: number) => imgs.push({ name: `${ep}5 Chapters ${i + 1}.png`, url }));
    if (u.thumbnail) imgs.push({ name: `${ep}6 Thumbnail 3000x3000.png`, url: u.thumbnail });
    if (!imgs.length) return NextResponse.json({ error: "This kit has no images yet." }, { status: 400 });

    let created = 0, updated = 0;
    const failed: string[] = [];
    for (const img of imgs) {
      try {
        const res = await fetch(img.url);
        if (!res.ok) throw new Error(String(res.status));
        const r = await upsertImage(img.name, Buffer.from(await res.arrayBuffer()), target.id);
        r === "created" ? created++ : updated++;
      } catch {
        failed.push(img.name);
      }
    }

    // Remember where the images went
    await supabase.from("guest_kits")
      .update({ extras: { ...(kit.extras || {}), driveImagesFolder: target.url, driveFolder: kit.extras?.driveFolder || `https://drive.google.com/drive/folders/${episodeFolderId}` } })
      .eq("slug", kit.slug);

    return NextResponse.json({ folderUrl: target.url, created, updated, failed, createdEpisodeFolder });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: `Couldn't save to Google Drive: ${e.message}` }, { status: 500 });
  }
}
