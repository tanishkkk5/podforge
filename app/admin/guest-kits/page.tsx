"use client";

import { useEffect, useMemo, useState } from "react";
import { TOPICS } from "@/lib/topics";

interface KitRow {
  slug: string;
  episode_number: string;
  guest_name: string;
  host_name: string;
  title: string;
  created_at: string;
  resources: { url?: string }[] | null;
  status?: string;
  topics?: string[];
}

export default function GuestKitsListPage() {
  const [kits, setKits] = useState<KitRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const shown = useMemo(() => (kits || []).filter((k) => !topic || (k.topics || []).includes(topic)), [kits, topic]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (kits || []).forEach((k) => (k.topics || []).forEach((t) => (c[t] = (c[t] || 0) + 1)));
    return c;
  }, [kits]);

  useEffect(() => {
    fetch("/api/guestkit")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load guest kits.");
        setKits(body.kits);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>Guest Kits</h1>
          <p>Every kit you&apos;ve generated. Open one to add resource links and get its Show Notes.</p>
        </div>
      </header>

      <div className="wrap" style={{ padding: "8px 24px 100px" }}>
        {error && <div className="error-banner">{error}</div>}
        {!kits && !error && <p className="hint">Loading…</p>}
        {kits && kits.length === 0 && (
          <p className="hint">
            No kits yet. Make one in the <a href="/admin/guest-kit-generator">Guest Kit Generator</a>.
          </p>
        )}

        {kits && kits.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0 16px" }}>
            {["", ...TOPICS].map((t) => (
              <button key={t || "all"} type="button" onClick={() => setTopic(t)}
                style={{
                  padding: "6px 12px", fontSize: 12.5,
                  background: topic === t ? "var(--af-navy)" : "#F0F3F6", color: topic === t ? "#fff" : "var(--af-navy)",
                }}>
                {t || "All topics"}{t && counts[t] ? ` (${counts[t]})` : ""}
              </button>
            ))}
          </div>
        )}
        {kits && topic && shown.length === 0 && <p className="hint">No kits tagged &quot;{topic}&quot; yet.</p>}

        {shown.map((k) => {
          const total = k.resources?.length || 0;
          const linked = k.resources?.filter((r) => r.url && r.url.trim()).length || 0;
          return (
            <div key={k.slug} className="section" style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", margin: "0 0 4px" }}>
                  EP-{k.episode_number} · {k.guest_name} · hosted by {k.host_name}
                </p>
                <p style={{ fontWeight: 700, margin: "0 0 4px" }}>
                  {k.title}{" "}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, verticalAlign: "middle",
                    background: k.status === "approved" ? "#ECFDF3" : "#FFF4E5", color: k.status === "approved" ? "#0E8A50" : "#B54708",
                  }}>
                    {k.status === "approved" ? "APPROVED" : "DRAFT — needs review"}
                  </span>
                </p>
                {(k.topics || []).length > 0 && (
                  <p style={{ fontSize: 12, color: "var(--af-navy)", margin: "0 0 4px" }}>{(k.topics || []).join(" · ")}</p>
                )}
                <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0 }}>
                  {new Date(k.created_at).toLocaleDateString()} · resource links: {linked}/{total}
                </p>
              </div>
              <a href={`/admin/guest-kits/${k.slug}`}>
                <button type="button">Open</button>
              </a>
            </div>
          );
        })}

        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
