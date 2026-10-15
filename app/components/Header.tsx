"use client";

import { usePathname } from "next/navigation";
import {
  Clapperboard, Library, Sparkles, Workflow, BarChart3, ClipboardList, CalendarClock, Inbox, SpellCheck,
  Upload, MessagesSquare, Scissors, BookOpen, Users, LogOut,
} from "./Icons";

const NavLink = ({ href, icon: I, children }: { href: string; icon: any; children: React.ReactNode }) => (
  <a href={href} style={{ display: "flex", alignItems: "center", gap: 9 }}>
    <I size={16} strokeWidth={2} aria-hidden />
    {children}
  </a>
);

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
          <NavLink href="/admin/production" icon={Clapperboard}>Episode Studio</NavLink>
          <NavLink href="/admin/guest-kits" icon={Library}>Episodes &amp; Guest Kits</NavLink>
          <NavLink href="/admin/assistant" icon={Sparkles}>Production Assistant</NavLink>
          <NavLink href="/admin/pipeline" icon={Workflow}>Episode Pipeline</NavLink>
          <NavLink href="/admin/stats" icon={BarChart3}>Weekly Stats</NavLink>
          <NavLink href="/" icon={ClipboardList}>Guest Intake</NavLink>
          <NavLink href="/admin" icon={CalendarClock}>Schedule Guest</NavLink>
          <NavLink href="/admin/submissions" icon={Inbox}>New Submissions</NavLink>
          <NavLink href="/tools/transcript-check" icon={SpellCheck}>Transcript Checker</NavLink>
          <NavLink href="/admin/upload-transcript" icon={Upload}>Upload Transcript</NavLink>
          <NavLink href="/tools/ask-archive" icon={MessagesSquare}>Ask Archive</NavLink>
        </nav>
      </div>

      <div className="af-nav-group">
        <p className="af-nav-group-label">Content</p>
        <nav className="af-nav">
          <NavLink href="/admin/clip-finder" icon={Scissors}>Clip Finder</NavLink>
          <NavLink href="/admin/library" icon={BookOpen}>Content Library</NavLink>
          <NavLink href="/admin/creators" icon={Users}>Creator Kits</NavLink>
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><LogOut size={16} aria-hidden />Log Out</span>
        </button>
      </div>
    </div>
  );
}
