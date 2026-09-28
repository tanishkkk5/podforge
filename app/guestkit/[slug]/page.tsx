import { getSupabaseAdmin } from "@/lib/supabase";
import GuestKitClient from "./client";

export const runtime = "nodejs";

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

  return <GuestKitClient kit={data} />;
}
