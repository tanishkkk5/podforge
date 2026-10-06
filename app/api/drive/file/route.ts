import { NextRequest, NextResponse } from "next/server";
import { readDropFile } from "@/lib/drive.server";

// Login required. Text of one file from the Riverside drop folder.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing file id." }, { status: 400 });
    return NextResponse.json(await readDropFile(id));
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Couldn't read that file." }, { status: 500 });
  }
}
