import { NextRequest, NextResponse } from "next/server";
import { tagItem } from "@/lib/library";

// Login required (see middleware.ts). Re-runs the AI topic tagger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await tagItem(params.id));
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Tagging failed." }, { status: 500 });
  }
}
