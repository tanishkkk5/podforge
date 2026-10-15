/**
 * Podforge navigation (decision 0018): 5 places in the sidebar, everything else is a tab inside one of them.
 * Each old page keeps its URL; it just lives under one section now.
 */
export interface NavTab { label: string; href: string; external?: boolean; match?: string[] }
export interface NavSection { key: string; label: string; icon: string; href: string; tabs: NavTab[] }

export const NAV: NavSection[] = [
  {
    key: "home", label: "Home", icon: "home", href: "/admin/assistant",
    tabs: [
      { label: "What needs you", href: "/admin/assistant" },
      { label: "Weekly stats", href: "/admin/stats" },
    ],
  },
  {
    key: "guests", label: "Guests", icon: "users", href: "/admin/submissions",
    tabs: [
      { label: "Intake forms", href: "/admin/submissions" },
      { label: "Schedule a guest", href: "/admin", match: ["/admin"] },
      { label: "Open the intake form", href: "/", external: true },
    ],
  },
  {
    key: "episodes", label: "Episodes", icon: "clapperboard", href: "/admin/guest-kits",
    tabs: [
      { label: "All episodes", href: "/admin/guest-kits", match: ["/admin/guest-kits"] },
      { label: "New episode", href: "/admin/production", match: ["/admin/production", "/admin/guest-kit-generator"] },
      { label: "Import from Drive", href: "/admin/pipeline" },
      { label: "Clip finder", href: "/admin/clip-finder" },
    ],
  },
  {
    key: "content", label: "Content", icon: "library", href: "/admin/library",
    tabs: [
      { label: "Content library", href: "/admin/library" },
      { label: "Creator kits", href: "/admin/creators" },
    ],
  },
  {
    key: "archive", label: "Ask Archive", icon: "messages", href: "/tools/ask-archive",
    tabs: [
      { label: "Ask", href: "/tools/ask-archive" },
      { label: "Add a transcript", href: "/admin/upload-transcript" },
      { label: "Name checker", href: "/tools/transcript-check" },
    ],
  },
];

const tabMatches = (t: NavTab, path: string) =>
  (t.match || [t.href]).some((m) => (m === "/admin" ? path === "/admin" || path === "/admin/" : path === m || path.startsWith(m + "/")));

/** Which section + tab a page belongs to. */
export function locate(path: string): { section: NavSection | null; tab: NavTab | null } {
  for (const s of NAV) {
    const tab = s.tabs.find((t) => !t.external && tabMatches(t, path));
    if (tab) return { section: s, tab };
  }
  return { section: null, tab: null };
}
