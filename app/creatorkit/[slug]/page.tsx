import { getSupabaseAdmin } from "@/lib/supabase";
import CreatorKitClient from "./client";
import { viewerIsAdmin, BeingPrepared, PreviewBanner } from "@/app/components/KitGate";

// PUBLIC page (no login, no internal menu) — what an outside creator sees.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CreatorKitPage({ params }: { params: { slug: string } }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("creator_kits")
    .select("slug, creator_name, topics, listen_url, items, created_at, status")
    .eq("slug", params.slug)
    .single();

  if (error || !data) {
    return (
      <div className="success">
        <h1>We couldn&apos;t find that content kit.</h1>
        <p>Double check the link, or reach out to tpandey@appliedframeworks.com.</p>
      </div>
    );
  }
  // Only approved kits are visible to creators; the team can preview drafts.
  if (data.status !== "approved") {
    if (!(await viewerIsAdmin())) return <BeingPrepared what="content kit" />;
    return (
      <>
        <PreviewBanner editHref="/admin/creators" />
        <CreatorKitClient kit={data} />
      </>
    );
  }
  return <CreatorKitClient kit={data} />;
}
