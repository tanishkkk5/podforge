import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { embedTexts, chunkText } from "@/lib/voyage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { password, episodeName, sourceType, content } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }
    if (!episodeName || !sourceType || !content) {
      return NextResponse.json(
        { error: "Episode name, source type, and content are required." },
        { status: 400 }
      );
    }

    const chunks = chunkText(content);
    const embeddings = await embedTexts(chunks, "document");

    const supabase = getSupabaseAdmin();
    const rows = chunks.map((chunk, i) => ({
      episode_name: episodeName,
      source_type: sourceType,
      chunk_index: i,
      content: chunk,
      embedding: embeddings[i],
    }));

    const { error } = await supabase.from("transcript_chunks").insert(rows);
    if (error) {
      console.error("Insert failed:", error.message);
      return NextResponse.json({ error: "Could not save chunks." }, { status: 500 });
    }

    return NextResponse.json({ status: "ok", chunksStored: rows.length });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
