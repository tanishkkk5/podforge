import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";

/** True when the person viewing is logged in to Podforge (team preview). */
export async function viewerIsAdmin(): Promise<boolean> {
  return isValidAdminCookie(cookies().get(ADMIN_COOKIE_NAME)?.value);
}

/** What a guest or creator sees before the kit is approved (decision 0009). */
export function BeingPrepared({ what }: { what: string }) {
  return (
    <div className="success">
      <h1>Your {what} is being prepared.</h1>
      <p>We&apos;re giving it a final check — you&apos;ll get it very soon. Questions? Email tpandey@appliedframeworks.com.</p>
    </div>
  );
}

/** Banner the team sees when previewing a kit that isn't approved yet. */
export function PreviewBanner({ editHref }: { editHref: string }) {
  return (
    <div style={{ background: "#FFF4E5", borderBottom: "1px solid #F5C77E", padding: "10px 24px", fontSize: 14, textAlign: "center" }}>
      <strong>Team preview — DRAFT.</strong> The guest/creator sees a &quot;being prepared&quot; message until this is approved.{" "}
      <a href={editHref}>Review &amp; approve →</a>
    </div>
  );
}
