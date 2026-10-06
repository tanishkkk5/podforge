import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { listDropFiles } from "@/lib/drive.server";

// Login required. Files in the Riverside drop folder, marked if already processed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const files = await listDropFiles();
    const { data } = await getSupabaseAdmin().from("drop_files").select("file_id");
    const done = new Set((data || []).map((r: any) => r.file_id));
    return NextResponse.json({ files: files.map((f) => ({ ...f, processed: done.has(f.id) })) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Couldn't read the drop folder." }, { status: 500 });
  }
}
