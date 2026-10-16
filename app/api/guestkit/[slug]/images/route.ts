import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchHeadshot, kitImageInput, renderKitImages } from "@/lib/kitImages.server";

// Login required (middleware.ts). Rebuilds every image from the kit's current (edited) text.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: kit, error } = await supabase.from("guest_kits").select("*").eq("slug", params.slug).single();
    if (error || !kit) return NextResponse.json({ error: "Guest kit not found." }, { status: 404 });
    if (kit.status === "approved") return NextResponse.json({ error: "This kit is approved, so it's final. Move it back to draft to change it." }, { status: 409 });

    const headshot = await fetchHeadshot(kit.headshot_url);
    const image_urls = await renderKitImages(kitImageInput(kit), headshot);
    const { data, error: upErr } = await supabase.from("guest_kits")
      .update({ image_urls, updated_at: new Date().toISOString() }).eq("slug", kit.slug).select().single();
    if (upErr) throw new Error(upErr.message);
    return NextResponse.json({ kit: data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: `Couldn't rebuild the images: ${e.message}` }, { status: 500 });
  }
}
