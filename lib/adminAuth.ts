export const ADMIN_COOKIE_NAME = "podforge_admin_session";

/**
 * Uses the Web Crypto API (globalThis.crypto.subtle), not Node's 'crypto'
 * module — this file is imported by middleware.ts, which runs on the Edge
 * Runtime and doesn't support Node-specific modules.
 */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getExpectedCookieValue(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD || "";
  return sha256Hex(password);
}

export async function isValidAdminCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await getExpectedCookieValue();
  return cookieValue === expected;
}
