import { NextRequest, NextResponse } from "next/server";
import { digestPart } from "@/lib/groq";
import { GroqRateLimitError } from "@/lib/groqClient";
import { fixTranscript } from "@/lib/transcriptFixes";

// Login required (middleware.ts, /api/guestkit). Notes for ONE part of a long transcript (decision 0019).
// The Episode Studio page calls this once per part, one per minute (free Groq limit), then drafts from all notes.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const part = fixTranscript(String(b.part || "")).text;
    const index = Number(b.index) || 0;
    const total = Number(b.total) || 1;
    if (!part.trim()) return NextResponse.json({ error: "Empty part." }, { status: 400 });
    if (part.length > 20000) return NextResponse.json({ error: "Part too long (max 20,000 characters)." }, { status: 400 });
    const notes = await digestPart(part, index, total, String(b.guestName || "the guest"), String(b.hostName || "the host"));
    return NextResponse.json({ notes });
  } catch (e: any) {
    const rate = e instanceof GroqRateLimitError;
    return NextResponse.json({ error: e.message || "Couldn't read this part.", rateLimited: rate }, { status: rate ? 429 : 500 });
  }
}
