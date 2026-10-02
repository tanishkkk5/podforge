import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { writeCreatorCaptions, withCredit } from "@/lib/creatorCaptions";
import { GroqRateLimitError } from "@/lib/topicTagger";
import { frameworkByName } from "@/lib/frameworks";

// Login required (see middleware.ts). The finished kit page itself
// (/creatorkit/[slug]) is public, like a guest kit.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ITEMS = 6;

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "creator";
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("creator_kits")
    .select("slug, created_at, creator_id, creator_name, topics, items")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    kits: (data || []).map((k: any) => ({ ...k, item_count: (k.items || []).length, items: undefined })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const itemIds: string[] = Array.isArray(b.item_ids) ? b.item_ids.map(String).slice(0, MAX_ITEMS) : [];
    if (!b.creator_id) return NextResponse.json({ error: "Pick a creator." }, { status: 400 });
    if (itemIds.length === 0) return NextResponse.json({ error: "Pick at least one clip." }, { status: 400 });
    const listenUrl = String(b.listen_url || "").trim() || "https://profit-streams.com/profit-streams-podcast";

    const supabase = getSupabaseAdmin();
    const { data: creator, error: cErr } = await supabase.from("creators").select("*").eq("id", b.creator_id).single();
    if (cErr || !creator) return NextResponse.json({ error: "Creator not found." }, { status: 404 });

    const { data: rows, error: iErr } = await supabase
      .from("media_items")
      .select("id, kind, title, guest_name, episode_label, video_url, summary, topics, frameworks, transcript")
      .in("id", itemIds);
    if (iErr) throw new Error(iErr.message);
    // keep the order the user picked
    const items = itemIds.map((id) => (rows || []).find((r: any) => r.id === id)).filter(Boolean) as any[];
    if (items.length === 0) return NextResponse.json({ error: "Those clips weren't found." }, { status: 404 });

    let captions;
    try {
      captions = await writeCreatorCaptions(
        creator.name,
        creator.topics || [],
        items.map((i) => ({
          id: i.id,
          title: i.title,
          guest_name: i.guest_name,
          summary: i.summary,
          excerpt: String(i.transcript || "").slice(0, 1200),
        }))
      );
    } catch (err) {
      if (err instanceof GroqRateLimitError) return NextResponse.json({ error: err.message }, { status: 429 });
      throw err;
    }

    const snapshot = items.map((i) => ({
      item_id: i.id,
      kind: i.kind,
      title: i.title,
      guest_name: i.guest_name,
      episode_label: i.episode_label,
      video_url: i.video_url,
      summary: i.summary,
      topics: i.topics || [],
      frameworks: (i.frameworks || [])
        .map((n: string) => frameworkByName(n))
        .filter(Boolean)
        .map((f: any) => ({ name: f.name, url: f.url })),
      captions: withCredit(captions.captions[i.id], i.guest_name, listenUrl),
    }));

    const slug = `${slugify(creator.name)}-${Date.now().toString(36)}`;
    const { data: kit, error: kErr } = await supabase
      .from("creator_kits")
      .insert({
        slug,
        creator_id: creator.id,
        creator_name: creator.name,
        topics: creator.topics || [],
        listen_url: listenUrl,
        items: snapshot,
      })
      .select("slug")
      .single();
    if (kErr || !kit) throw new Error(kErr?.message || "Could not save the kit.");

    return NextResponse.json({
      slug: kit.slug,
      usedFallback: captions.usedFallback,
      missingVideo: snapshot.filter((s) => !s.video_url).map((s) => s.title),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not make the kit." }, { status: 500 });
  }
}
