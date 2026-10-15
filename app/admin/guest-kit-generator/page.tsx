import { redirect } from "next/navigation";

// The Guest Kit Generator is now step 1 of the Episode Studio (decision 0016).
// Old links (and the Production Assistant's ?guest=&ep=&host= links) keep working.
export default function GuestKitGeneratorRedirect({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams || {})) if (typeof v === "string") q.set(k, v);
  const qs = q.toString();
  redirect(`/admin/production${qs ? `?${qs}` : ""}`);
}
