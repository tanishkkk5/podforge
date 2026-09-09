import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { embedTexts } from "@/lib/voyage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "A question is required." }, { status: 400 });
    }

    const [queryEmbedding] = await embedTexts([query], "query");
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("match_transcript_chunks", {
      query_embedding: queryEmbedding,
      match_count: 8,
    });

    if (error) {
      console.error("Search failed:", error.message);
      return NextResponse.json({ error: "Search failed." }, { status: 500 });
    }

    return NextResponse.json({ matches: data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
