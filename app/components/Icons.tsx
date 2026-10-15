"use client";
/**
 * Podforge icon pack (decision 0017): Lucide for every UI icon (one consistent outline style),
 * official brand marks (lib/brandIcons.ts) for platforms. No emoji icons in the UI.
 */
import { BRANDS, Brand } from "@/lib/brandIcons";
export {
  Clapperboard, Library, Sparkles, Workflow, BarChart3, ClipboardList, CalendarClock, Inbox, SpellCheck,
  Upload, MessagesSquare, Scissors, BookOpen, Users, LogOut, Search, FolderOpen, Download, Pencil, RotateCcw,
  Lock, CheckCircle2, AlertTriangle, Copy, Check, Save, Wand2, Image as ImageIcon, Link2, Hash, Database,
  ExternalLink, ArrowRight, X,
} from "lucide-react";

export function BrandIcon({ brand, size = 18, color }: { brand: Brand; size?: number; color?: string }) {
  const b = BRANDS[brand];
  return (
    <svg role="img" aria-label={b.title} width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, verticalAlign: "middle" }}>
      <path d={b.path} fill={color || b.hex} />
    </svg>
  );
}

/** Icon + label, aligned. */
export function IconLabel({ icon: I, children, size = 16 }: { icon: any; children: React.ReactNode; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <I size={size} strokeWidth={2} aria-hidden />
      {children}
    </span>
  );
}
