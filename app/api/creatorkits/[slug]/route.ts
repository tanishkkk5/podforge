import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { reviewUpdate } from "@/lib/review";

// Login required (see middleware.ts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("creator_kits").delete().eq("slug", params.slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

// Approve (or move back to draft) — the creator's link only works once approved.
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const review = reviewUpdate(await req.json());
  if (review.error) return NextResponse.json({ error: review.error }, { status: 400 });
  if (!review.update) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("creator_kits")
    .update(review.update)
    .eq("slug", params.slug)
    .select("slug, status, reviewed_by, reviewed_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kit: data });
}
