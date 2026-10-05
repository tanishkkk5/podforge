/**
 * Approval gate shared by guest kits and creator kits
 * (decision 0009 · knowledge/standards/review-standard.md).
 * Turns a { review: "approve" | "unapprove", reviewer } request into the
 * database fields to update, or an error message.
 */
export type KitStatus = "draft" | "approved";

export function reviewUpdate(body: any): { update?: Record<string, any>; error?: string } {
  if (body?.review === "approve") {
    const reviewer = String(body.reviewer || "").trim();
    if (!reviewer) return { error: "Type your name to approve — it's recorded with the approval." };
    return { update: { status: "approved", reviewed_by: reviewer.slice(0, 80), reviewed_at: new Date().toISOString() } };
  }
  if (body?.review === "unapprove") {
    return { update: { status: "draft", reviewed_by: null, reviewed_at: null } };
  }
  return {};
}

export const isApproved = (k: { status?: string | null } | null | undefined) => k?.status === "approved";
