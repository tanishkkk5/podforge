import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";
import { kitPackageFiles, safeName } from "@/lib/kitPackage.server";

// PUBLIC (the guest uses it), but only for APPROVED kits; the team can download drafts.
// "Download all": every image + LinkedIn and Instagram captions in separate files.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: kit, error } = await supabase.from("guest_kits").select("*").eq("slug", params.slug).single();
    if (error || !kit) return NextResponse.json({ error: "Guest kit not found." }, { status: 404 });
    if (kit.status !== "approved" && !(await isValidAdminCookie(req.cookies.get(ADMIN_COOKIE_NAME)?.value))) {
      return NextResponse.json({ error: "This kit is still being prepared." }, { status: 403 });
    }

    const folder = safeName(`EP-${kit.episode_number} ${kit.guest_name} - Profit Streams Podcast Guest Kit`);
    const zip = new JSZip();
    const root = zip.folder(folder)!;
    const files = kitPackageFiles(kit);
    await Promise.all(
      files.map(async (f) => {
        if (f.text !== undefined) return root.file(f.path, f.text);
        const res = await fetch(f.url!);
        if (!res.ok) throw new Error(`Couldn't fetch ${f.path} (${res.status})`);
        root.file(f.path, Buffer.from(await res.arrayBuffer()));
      })
    );
    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
    return new NextResponse(buf as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${folder}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: `Download failed: ${e.message}` }, { status: 500 });
  }
}
