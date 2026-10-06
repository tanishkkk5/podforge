import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Login required (see middleware.ts). A person edits, approves or dismisses
// something the agent drafted. Approving records who and when.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const update: Record<string, any> = {};
    if (typeof b.content === "string") update.content = b.content;
    if (b.action === "approve") {
      const reviewer = String(b.reviewer || "").trim();
      if (!reviewer) return NextResponse.json({ error: "Type your name to approve." }, { status: 400 });
      Object.assign(update, { status: "approved", reviewed_by: reviewer.slice(0, 80), reviewed_at: new Date().toISOString() });
    } else if (b.action === "dismiss") {
      Object.assign(update, { status: "dismissed", reviewed_at: new Date().toISOString() });
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("agent_drafts").update(update).eq("id", params.id).select().single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ draft: data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Could not update the draft." }, { status: 500 });
  }
}
