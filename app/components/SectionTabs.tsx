"use client";

import { usePathname } from "next/navigation";
import { locate } from "@/lib/nav";
import { isPublicPage } from "./Header";
import { ExternalLink } from "./Icons";

/** Tabs for the current section, at the top of every internal page (decision 0018). */
export default function SectionTabs() {
  const pathname = usePathname() || "";
  if (isPublicPage(pathname)) return null;
  const { section, tab } = locate(pathname);
  if (!section || section.tabs.length < 2) return null;
  return (
    <div className="af-tabs-bar">
      <span className="af-tabs-section">{section.label}</span>
      <nav className="af-tabs" aria-label={`${section.label} sections`}>
        {section.tabs.map((t) => (
          <a key={t.href} href={t.href} target={t.external ? "_blank" : undefined} rel={t.external ? "noreferrer" : undefined}
            className={tab?.href === t.href ? "active" : undefined}>
            {t.label}
            {t.external && <ExternalLink size={12} aria-hidden style={{ marginLeft: 4 }} />}
          </a>
        ))}
      </nav>
    </div>
  );
}
