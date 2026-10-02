import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { cleanCreator } from "@/lib/creators";

// Login required (see middleware.ts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("creators").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creators: data || [] });
}

export async function POST(req: NextRequest) {
  const fields = cleanCreator(await req.json());
  if (!fields.name) return NextResponse.json({ error: "A name is required." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("creators").insert(fields).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creator: data });
}
