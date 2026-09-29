import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";

// Every /admin/* PAGE requires login, except the login page itself.
// The specific API routes below also require it, since a browser fetch()
// to our own API sends the same cookie automatically.
const PROTECTED_API_PATHS = [
  "/api/sessions",
  "/api/submissions",
  "/api/guestkit/generate",
  "/api/transcripts/ingest",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const authed = await isValidAdminCookie(cookie);

  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isProtectedApi = PROTECTED_API_PATHS.some((p) => pathname.startsWith(p));

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
  matcher: ["/admin/:path*", "/api/sessions/:path*", "/api/submissions/:path*", "/api/guestkit/:path*", "/api/transcripts/ingest"],
};
