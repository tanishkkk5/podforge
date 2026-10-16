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
      // Show the real reason (e.g. migration_v4 not run: function match_transcript_chunks missing)
      const hint = /match_transcript_chunks|function|does not exist|schema cache/i.test(error.message)
        ? " Run supabase/migration_v4.sql in Supabase → SQL Editor."
        : "";
      return NextResponse.json({ error: `Search failed: ${error.message}.${hint}` }, { status: 500 });
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
