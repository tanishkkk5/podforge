import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";

// Every /admin/* PAGE requires login, except the login page itself.
// The specific API routes below also require it, since a browser fetch()
// to our own API sends the same cookie automatically.
// Exact-match only: /api/sessions/[token] and /api/sessions/[token]/reschedule
// are GUEST-facing and must stay public, so "/api/sessions" can't be a prefix.
const PROTECTED_API_EXACT = ["/api/sessions"];

const PROTECTED_API_PATHS = [
  "/api/submissions",
  "/api/guestkit", // generate + list + read/save kits (guest page reads the DB directly)
  "/api/transcripts/ingest",
  "/api/library",
  "/api/creators",
  "/api/creatorkits",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const authed = await isValidAdminCookie(cookie);

  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isProtectedApi =
    PROTECTED_API_EXACT.includes(pathname.replace(/\/$/, "")) ||
    PROTECTED_API_PATHS.some((p) => pathname.startsWith(p));

  if (authed) return NextResponse.next();

  if (isAdminPage) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedApi) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/sessions/:path*", "/api/submissions/:path*", "/api/guestkit", "/api/guestkit/:path*", "/api/transcripts/ingest", "/api/library", "/api/library/:path*", "/api/creators", "/api/creators/:path*", "/api/creatorkits", "/api/creatorkits/:path*"],
};
