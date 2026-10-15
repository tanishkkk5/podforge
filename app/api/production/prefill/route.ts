import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hostByKey } from "@/lib/hosts";

// Login required (middleware.ts). Episode Studio step 1: every guest who filled the
// intake form (name, host, photo, links) + the next episode number.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const epNum = (s: unknown) => {
  const m = String(s || "").match(/\d+/);
  return m ? Number(m[0]) : 0;
};

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const [intakes, sessions, kits] = await Promise.all([
      supabase.from("guest_intakes")
        .select("id, created_at, full_name, email, role, company, headshot_url, linkedin, site_biz, site_personal, other_links, host, session_id")
        .order("created_at", { ascending: false }).limit(300),
      supabase.from("recording_sessions").select("id, host_name, scheduled_at").limit(500),
      supabase.from("guest_kits").select("slug, guest_name, episode_number, intake_id").limit(1000),
    ]);
    if (intakes.error) throw new Error(intakes.error.message);

    const kitRows = kits.data || [];
    const lastEpisode = kitRows.reduce((m, k: any) => Math.max(m, epNum(k.episode_number)), 0);
    const norm = (s: string) => (s || "").trim().toLowerCase();

    const guests = (intakes.data || []).map((i: any) => {
      const session = (sessions.data || []).find((s: any) => s.id === i.session_id);
      const kit = kitRows.find((k: any) => k.intake_id === i.id) || kitRows.find((k: any) => norm(k.guest_name) === norm(i.full_name));
      const other = [
        i.site_biz && `Website: ${i.site_biz}`,
        i.site_personal && `Personal site: ${i.site_personal}`,
        ...(String(i.other_links || "").split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean)),
      ].filter(Boolean).join("\n");
      return {
        intakeId: i.id,
        createdAt: i.created_at,
        name: i.full_name,
        email: i.email,
        hostName: session?.host_name || hostByKey(i.host).name,
        recordedAt: session?.scheduled_at || null,
        guestTitle: [i.role, i.company].filter(Boolean).join(", "),
        headshotUrl: i.headshot_url || "",
        linkedin: i.linkedin || "",
        otherLinks: other,
        kitSlug: kit?.slug || null,
        kitEpisode: kit?.episode_number || null,
      };
    });

    return NextResponse.json({ guests, lastEpisode, nextEpisode: lastEpisode + 1 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Could not load guests." }, { status: 500 });
  }
}
