"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { mondayOf } from "@/lib/episodes";

interface Row {
  week_of: string; platform: "spotify" | "apple";
  followers_total: number | null; plays_7d: number | null; latest_episode_plays: number | null; notes: string | null;
}
const PLATFORMS = [
  { key: "spotify", name: "Spotify", color: "#1D9E75", where: "creators.spotify.com → your show → Overview (Followers, Plays). Latest episode: Episodes tab." },
  { key: "apple", name: "Apple Podcasts", color: "#7F77DD", where: "podcastsconnect.apple.com → Analytics → your show (Followers, Plays). Latest episode: Episodes." },
] as const;
const FIELDS = [
  { key: "followers_total", label: "Total followers" },
  { key: "plays_7d", label: "Plays, last 7 days" },
  { key: "latest_episode_plays", label: "Latest episode plays" },
] as const;

const fmtWeek = (w: string) => new Date(w + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

function LineChart({ rows, field, title }: { rows: Row[]; field: keyof Row; title: string }) {
  const weeks = Array.from(new Set(rows.map((r) => r.week_of))).sort().slice(-12);
  const series = PLATFORMS.map((p) => ({
    ...p,
    pts: weeks.map((w) => rows.find((r) => r.week_of === w && r.platform === p.key)?.[field] as number | null ?? null),
  }));
  const vals = series.flatMap((s) => s.pts).filter((v): v is number => v !== null);
  if (weeks.length < 2 || !vals.length) return <p className="hint">{title}: add at least two weeks to see a trend.</p>;
  const W = 560, H = 180, L = 50, B = 26, max = Math.max(...vals) * 1.1 || 1, min = Math.min(0, ...vals);
  const x = (i: number) => L + (i * (W - L - 10)) / (weeks.length - 1);
  const y = (v: number) => H - B - ((v - min) / (max - min)) * (H - B - 10);
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontWeight: 700, margin: "0 0 4px", fontSize: 14 }}>{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W }} role="img" aria-label={`${title} by week`}>
        {[0, 0.5, 1].map((t) => {
          const v = Math.round(min + t * (max - min));
          return <g key={t}><line x1={L} x2={W - 10} y1={y(v)} y2={y(v)} stroke="#E3E8EE" /><text x={L - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill="#6B7785">{v.toLocaleString()}</text></g>;
        })}
        {weeks.map((w, i) => <text key={w} x={x(i)} y={H - 6} fontSize="11" textAnchor="middle" fill="#6B7785">{fmtWeek(w)}</text>)}
        {series.map((s) => {
          const d = s.pts.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean).join(" ");
          return <g key={s.key}><polyline points={d} fill="none" stroke={s.color} strokeWidth="2" />
            {s.pts.map((v, i) => v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={s.color} />)}</g>;
        })}
      </svg>
      <p style={{ fontSize: 12.5, margin: 0 }}>
        {PLATFORMS.map((p) => <span key={p.key} style={{ marginRight: 14 }}><span style={{ color: p.color }}>●</span> {p.name}</span>)}
      </p>
    </div>
  );
}

export default function StatsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [week, setWeek] = useState(mondayOf(new Date()));
  const [form, setForm] = useState<Record<string, Record<string, string>>>({ spotify: {}, apple: {} });
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/stats", { cache: "no-store" });
    const b = await res.json();
    if (!res.ok) return setError(b.error || "Couldn't load stats.");
    setRows(b.stats);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Fill the form with what's already saved for the chosen week
  useEffect(() => {
    const f: Record<string, Record<string, string>> = { spotify: {}, apple: {} };
    for (const r of rows.filter((r) => r.week_of === week)) {
      for (const k of [...FIELDS.map((x) => x.key), "notes"]) {
        const v = (r as any)[k];
        f[r.platform][k] = v === null || v === undefined ? "" : String(v);
      }
    }
    setForm(f);
  }, [rows, week]);

  async function save() {
    setMsg(null); setError(null);
    for (const p of PLATFORMS) {
      const res = await fetch("/api/stats", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_of: week, platform: p.key, ...form[p.key], entered_by: "Tanisk Pandey" }),
      });
      const b = await res.json();
      if (!res.ok) return setError(`${p.name}: ${b.error}`);
    }
    setMsg("✅ Saved.");
    load();
  }

  const summary = useMemo(() => PLATFORMS.map((p) => {
    const mine = rows.filter((r) => r.platform === p.key && r.followers_total !== null).sort((a, b) => a.week_of.localeCompare(b.week_of));
    const last = mine[mine.length - 1], prev = mine[mine.length - 2];
    return { ...p, last, gained: last && prev ? (last.followers_total || 0) - (prev.followers_total || 0) : null };
  }), [rows]);

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>Weekly Stats</h1>
          <p>Spotify and Apple don&apos;t offer an official way to pull these automatically, so copy them in once a week (2 minutes) — Podforge tracks the trends.</p>
        </div>
      </header>

      <div className="wrap" style={{ padding: "8px 24px 100px" }}>
        {error && <div className="error-banner">{error}</div>}

        <div className="section">
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {summary.map((s) => (
              <div key={s.key} style={{ flex: 1, minWidth: 200, border: "1px solid var(--line)", borderRadius: 8, padding: 14 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: s.color }}>{s.name.toUpperCase()}</p>
                <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 700 }}>{s.last?.followers_total?.toLocaleString() ?? "—"}</p>
                <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
                  followers{s.gained !== null ? ` · ${s.gained >= 0 ? "+" : ""}${s.gained} since the week before` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h2 style={{ marginTop: 0 }}>This week&apos;s check-in</h2>
          <div className="field">
            <label>Week starting (Monday)</label>
            <input type="date" value={week} onChange={(e) => e.target.value && setWeek(mondayOf(new Date(e.target.value + "T12:00:00Z")))} style={{ maxWidth: 200 }} />
          </div>
          {PLATFORMS.map((p) => (
            <div key={p.key} style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 12 }}>
              <p style={{ fontWeight: 700, margin: "0 0 2px", color: p.color }}>{p.name}</p>
              <p className="sub" style={{ margin: "0 0 8px" }}>Where to find it: {p.where}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                {FIELDS.map((f) => (
                  <div key={f.key} className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 13 }}>{f.label}</label>
                    <input type="text" inputMode="numeric" value={form[p.key]?.[f.key] || ""}
                      onChange={(e) => setForm({ ...form, [p.key]: { ...form[p.key], [f.key]: e.target.value } })} />
                  </div>
                ))}
              </div>
              <input type="text" placeholder="Notes (optional) — e.g. Mike Gilpin episode out Sunday" value={form[p.key]?.notes || ""}
                onChange={(e) => setForm({ ...form, [p.key]: { ...form[p.key], notes: e.target.value } })} style={{ marginTop: 8 }} />
            </div>
          ))}
          <button type="button" onClick={save} style={{ marginTop: 14 }}>Save this week</button>
          {msg && <span style={{ marginLeft: 12 }}>{msg}</span>}
        </div>

        <div className="section">
          <h2 style={{ marginTop: 0 }}>Trends</h2>
          <LineChart rows={rows} field="followers_total" title="Total followers" />
          <LineChart rows={rows} field="plays_7d" title="Plays per week" />
          <LineChart rows={rows} field="latest_episode_plays" title="Latest episode plays" />
        </div>
        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
