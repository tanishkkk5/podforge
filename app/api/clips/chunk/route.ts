import { NextRequest, NextResponse } from "next/server";
import { findClipsInChunk } from "@/lib/helpers/clipFinder";
import { GroqRateLimitError } from "@/lib/topicTagger";
import { Block } from "@/lib/captions";

// Login required (see middleware.ts). Clip Finder: the browser sends one chunk
// of ~15-second caption blocks at a time (one free-tier AI call per chunk).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { blocks, guest } = await req.json();
    if (!Array.isArray(blocks) || blocks.length === 0 || blocks.length > 400) {
      return NextResponse.json({ error: "Send between 1 and 400 caption blocks." }, { status: 400 });
    }
    const clean: Block[] = blocks
      .map((b: any) => ({ id: Number(b.id), start: Number(b.start), end: Number(b.end), text: String(b.text || "").slice(0, 2000) }))
      .filter((b) => Number.isFinite(b.id) && Number.isFinite(b.start) && Number.isFinite(b.end));
    if (clean.reduce((n, b) => n + b.text.length, 0) > 20000) {
      return NextResponse.json({ error: "This chunk is too large for one request." }, { status: 400 });
    }
    const clips = await findClipsInChunk(clean, String(guest || "").slice(0, 120));
    return NextResponse.json({ clips });
  } catch (e: any) {
    if (e instanceof GroqRateLimitError) return NextResponse.json({ error: e.message, rateLimited: true }, { status: 429 });
    console.error(e);
    return NextResponse.json({ error: e.message || "Clip search failed." }, { status: 500 });
  }
}
