import { getSupabaseAdmin } from "@/lib/supabase";
import GuestKitClient from "./client";
import { viewerIsAdmin, BeingPrepared, PreviewBanner } from "@/app/components/KitGate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function GuestKitPage({ params }: { params: { slug: string } }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("guest_kits")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (error || !data) {
    return (
      <div className="success">
        <h1>We couldn&apos;t find that guest kit.</h1>
        <p>Double check the link, or reach out to tpandey@appliedframeworks.com.</p>
      </div>
    );
  }

  // Only approved kits are visible to guests; the team can preview drafts.
  if (data.status !== "approved") {
    if (!(await viewerIsAdmin())) return <BeingPrepared what="guest kit" />;
    return (
      <>
        <PreviewBanner editHref={`/admin/guest-kits/${data.slug}`} />
        <GuestKitClient kit={data} />
      </>
    );
  }
  return <GuestKitClient kit={data} />;
}
