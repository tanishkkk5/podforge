import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";

// Public, harmless: only says whether THIS browser is logged in to Podforge.
// Guest-facing pages use it to show extra team-only info to staff.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await isValidAdminCookie(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
  return NextResponse.json({ admin }, { headers: { "Cache-Control": "no-store" } });
}
