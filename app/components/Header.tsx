"use client";

import { usePathname } from "next/navigation";

// Pages a GUEST or outside CREATOR can see. They must never show the
// internal menu, so the sidebar is hidden there.
const PUBLIC_PREFIXES = ["/guestkit/", "/creatorkit/", "/session/"];
function isPublicPage(path: string | null) {
  if (!path) return false;
  return path === "/" || PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

async function handleLogout() {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin/login";
}

export default function Header() {
  const pathname = usePathname();
  if (isPublicPage(pathname)) return null;
  return (
    <div className="af-sidebar">
      <div className="af-sidebar-brand">
        <img src="/af-swoosh-icon.png" alt="Applied Frameworks" className="af-logo" />
        <span className="af-sidebar-title">PROFIT STREAMS® PODCAST</span>
      </div>

      <div className="af-nav-group">
        <p className="af-nav-group-label">Production</p>
        <nav className="af-nav">
          <a href="/admin/assistant">✨ Production Assistant</a>
          <a href="/">Guest Intake</a>
          <a href="/admin">Schedule Guest</a>
          <a href="/admin/submissions">New Submissions</a>
          <a href="/tools/transcript-check">Transcript Checker</a>
          <a href="/admin/upload-transcript">Upload Transcript</a>
          <a href="/tools/ask-archive">Ask Archive</a>
        </nav>
      </div>

      <div className="af-nav-group">
        <p className="af-nav-group-label">Guest Kit</p>
        <nav className="af-nav">
          <a href="/admin/guest-kit-generator">Guest Kit Generator</a>
          <a href="/admin/guest-kits">Guest Kits &amp; Show Notes</a>
          <a href="/admin/clip-finder">Clip Finder</a>
          <a href="/admin/library">Content Library</a>
          <a href="/admin/creators">Creator Kits</a>
        </nav>
      </div>

      <div className="af-nav-group">
        <button
          type="button"
          onClick={handleLogout}
          style={{
            background: "none", border: "none", padding: "8px 10px",
            fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 600,
            color: "var(--ink-soft)", cursor: "pointer", textAlign: "left",
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
