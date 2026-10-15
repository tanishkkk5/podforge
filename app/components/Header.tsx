"use client";

import { usePathname } from "next/navigation";
import { Home, Users, Clapperboard, Library, MessagesSquare, LogOut, ExternalLink } from "./Icons";
import { NAV, locate } from "@/lib/nav";

// Pages a GUEST or outside CREATOR can see. They must never show the internal menu.
const PUBLIC_PREFIXES = ["/guestkit/", "/creatorkit/", "/session/"];
export function isPublicPage(path: string | null) {
  if (!path) return false;
  return path === "/" || PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

const ICONS: Record<string, any> = { home: Home, users: Users, clapperboard: Clapperboard, library: Library, messages: MessagesSquare };

async function handleLogout() {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin/login";
}

/** Sidebar: the 5 places in Podforge (decision 0018). */
export default function Header() {
  const pathname = usePathname();
  if (isPublicPage(pathname) || pathname === "/admin/login") return null;
  const { section } = locate(pathname || "");
  return (
    <aside className="af-sidebar">
      <a href="/admin/assistant" className="af-sidebar-brand">
        <img src="/af-swoosh-icon.png" alt="" className="af-logo" />
        <span>
          <span className="af-sidebar-title">Podforge</span>
          <span className="af-sidebar-sub">Profit Streams® Podcast</span>
        </span>
      </a>
      <nav className="af-nav" aria-label="Main">
        {NAV.map((s) => {
          const I = ICONS[s.icon];
          const active = section?.key === s.key;
          return (
            <a key={s.key} href={s.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
              <I size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
              {s.label}
            </a>
          );
        })}
      </nav>
      <div className="af-sidebar-foot">
        <a href="/" target="_blank" rel="noreferrer" className="af-foot-link">
          <ExternalLink size={15} aria-hidden /> Guest intake form
        </a>
        <button type="button" className="af-foot-link" onClick={handleLogout}>
          <LogOut size={15} aria-hidden /> Log out
        </button>
      </div>
    </aside>
  );
}
