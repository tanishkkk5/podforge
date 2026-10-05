import { createClient } from "@supabase/supabase-js";

// Server-side only. Uses the service role key, which bypasses Row Level
// Security — never expose this key to the browser or commit it to git.
// It's read from an environment variable set in Vercel (see README).
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    // Never let Next.js cache database reads. Without this, pages could show
    // stale data — e.g. a guest still seeing "being prepared" after a kit was
    // approved, or edits not appearing until the cache expired.
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
