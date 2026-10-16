import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { captionsFile } from "@/lib/guestCaptions";
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

    // ?only=takeaways → just the carousel: 10 PNG slides + one PDF (LinkedIn carousels are PDF "document" posts)
    const only = req.nextUrl.searchParams.get("only");
    const ep = `EP-${String(kit.episode_number || "").replace(/^ep-?/i, "")}`;
    const folder = safeName(only === "takeaways" ? `${ep} ${kit.guest_name} - Key Takeaways` : `${ep} ${kit.guest_name} - Profit Streams Podcast Guest Kit`);
    const zip = new JSZip();
    const root = zip.folder(folder)!;
    const all = kitPackageFiles(kit);
    const files = only === "takeaways" ? all.filter((f) => / 4 Takeaway /.test(f.path)) : all;
    const takeawayPngs: { path: string; buf: Buffer }[] = [];
    await Promise.all(
      files.map(async (f) => {
        if (f.text !== undefined) return root.file(f.path, f.text);
        const res = await fetch(f.url!);
        if (!res.ok) throw new Error(`Couldn't fetch ${f.path} (${res.status})`);
        const buf = Buffer.from(await res.arrayBuffer());
        root.file(only === "takeaways" ? f.path.replace(/^Posts\//, "") : f.path, buf);
        if (/ 4 Takeaway /.test(f.path)) takeawayPngs.push({ path: f.path, buf });
      })
    );
    if (takeawayPngs.length) {
      const pdf = await PDFDocument.create();
      for (const t of takeawayPngs.sort((a, b) => a.path.localeCompare(b.path))) {
        const img = await pdf.embedPng(t.buf);
        const page = pdf.addPage([1080, 1080]);
        page.drawImage(img, { x: 0, y: 0, width: 1080, height: 1080 });
      }
      root.file(`${only === "takeaways" ? "" : "Posts/"}${ep} Key Takeaways carousel (LinkedIn).pdf`, Buffer.from(await pdf.save()));
      if (only === "takeaways") {
        root.file("Caption - LinkedIn.txt", captionsFile(kit, "li", ["takeaways"]));
        root.file("Caption - Instagram.txt", captionsFile(kit, "ig", ["takeaways"]));
      }
    }
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
