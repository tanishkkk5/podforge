import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { tagTranscript, GroqRateLimitError } from "@/lib/topicTagger";

// Login required (see middleware.ts). Suggests topics for an EXISTING kit
// (made before topic tagging existed). Kits don't store the transcript, so
// the AI reads the kit's own title, summary and takeaways instead.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: kit, error } = await supabase
      .from("guest_kits")
      .select("title, hook, summary, takeaways")
      .eq("slug", params.slug)
      .single();
    if (error || !kit) return NextResponse.json({ error: "Guest kit not found." }, { status: 404 });

    const text = [kit.title, kit.hook, kit.summary, ...(kit.takeaways || [])].filter(Boolean).join("\n");
    const { topics } = await tagTranscript(text, "episode");
    // Suggestion only — nothing is saved until the person clicks Save topics.
    return NextResponse.json({ topics });
  } catch (err: any) {
    if (err instanceof GroqRateLimitError) return NextResponse.json({ error: err.message }, { status: 429 });
    console.error(err);
    return NextResponse.json({ error: err.message || "Could not suggest topics." }, { status: 500 });
  }
}
