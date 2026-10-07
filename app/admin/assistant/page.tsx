"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { STAGES, stageLabel, Suggestion } from "@/lib/episodes";
import { hostByKey } from "@/lib/hosts";

interface Episode {
  id: string; created_at: string; guest_name: string; guest_email: string | null; host_key: string;
  episode_number: string | null; intake_id: string | null; guest_kit_slug: string | null; stage: string;
  drive_folder_id?: string | null; guest_posted_at?: string | null;
}
interface Draft {
  id: string; created_at: string; episode_id: string | null; helper: string; title: string | null;
  content: string; status: string; reviewed_by: string | null; reviewed_at: string | null;
}

const HELPER_NAMES: Record<string, string> = {
  prep_brief: "Prep Brief Writer", follow_up: "Follow-up Drafter", clip_finder: "Clip Finder", outreach: "Outreach Drafter",
  social_pack: "Social Pack Writer", guest_share: "Guest Share Drafter", guest_reminder: "Guest Share Drafter",
};
const ghost: React.CSSProperties = { background: "#F0F3F6", color: "var(--af-navy)", padding: "6px 12px", fontSize: 12.5 };
const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function ProductionAssistantPage() {
  const [data, setData] = useState<{ episodes: Episode[]; drafts: Draft[]; suggestions: Suggestion[]; dropNote?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [reviewer, setReviewer] = useState("Tanisk Pandey");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [newGuest, setNewGuest] = useState("");
  const [newEp, setNewEp] = useState("");
  const [prospect, setProspect] = useState("");
  const [prospectNotes, setProspectNotes] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not load.");
      setData(body);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function call(key: string, url: string, method: string, payload?: any) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined });
      // Don't show a cryptic "Unexpected end of JSON input" if the server sent back nothing
      const raw = await res.text();
      let body: any = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
      if (!res.ok && !body.error) {
        throw new Error(res.status === 504 ? "That took too long and timed out — please try again." : `Something went wrong (error ${res.status}) — please try again.`);
      }
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      await load();
      return body;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  function act(s: Suggestion) {
    if (s.kind === "create_episode") return call(s.key, "/api/episodes", "POST", { intake_id: s.intakeId });
    if (s.kind === "advance") return call(s.key, `/api/episodes/${s.episodeId}`, "PATCH", { stage: s.to });
    if (s.kind === "link_kit") return call(s.key, `/api/episodes/${s.episodeId}`, "PATCH", { guest_kit_slug: s.slug });
    if (s.kind === "draft") return call(s.key, "/api/assistant/draft", "POST", { episode_id: s.episodeId, helper: s.helper });
    if (s.kind === "drive_folders") return call(s.key, "/api/drive/folders", "POST", { episode_id: s.episodeId });
  }

  const pendingDrafts = useMemo(() => (data?.drafts || []).filter((d) => d.status === "draft"), [data]);
  const suggestions = useMemo(() => (data?.suggestions || []).filter((s) => !hidden.has(s.key)), [data, hidden]);
  const episodeName = (id: string | null) => (id ? data?.episodes.find((e) => e.id === id)?.guest_name || "—" : "a new guest");
  const needsYou = suggestions.length + pendingDrafts.length;

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>✨ Production Assistant</h1>
          <p>
            Tracks every episode from intake to publish, notices what&apos;s next, and drafts it for you.
            It never acts on its own — you approve every step.
          </p>
        </div>
      </header>

      <div className="wrap" style={{ padding: "8px 24px 100px" }}>
        {error && <div className="error-banner">{error}</div>}
        {!data && !error && <p className="hint">Checking every episode…</p>}

        {data && (
          <>
            {/* ---------- NEEDS YOU ---------- */}
            <div className="section">
              <h2 style={{ marginTop: 0 }}>Needs you {needsYou > 0 ? `(${needsYou})` : ""}</h2>
              {needsYou === 0 && <p style={{ fontSize: 14 }}>✅ Nothing waiting on you right now.</p>}
              {data.dropNote && <p className="hint" style={{ marginTop: 0 }}>📂 {data.dropNote}</p>}

              {suggestions.map((s) => (
                <div key={s.key} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 18 }}>
                    {s.kind === "create_episode" ? "🆕" : s.kind === "advance" ? "➡️" : s.kind === "link_kit" ? "🔗" : s.kind === "draft" ? "✍️" : s.kind === "drive_folders" ? "📁" : "📋"}
                  </span>
                  <span style={{ flex: 1, fontSize: 14 }}>{s.text}</span>
                  {s.kind === "todo" ? (
                    s.href && <a href={s.href}><button type="button" style={{ padding: "6px 12px", fontSize: 12.5 }}>Open →</button></a>
                  ) : (
                    <button type="button" disabled={busy === s.key} onClick={() => act(s)} style={{ padding: "6px 12px", fontSize: 12.5 }}>
                      {busy === s.key ? "Working…" :
                        s.kind === "create_episode" ? "Start tracking" : s.kind === "draft" ? "Draft it" : s.kind === "link_kit" ? "Link it" : s.kind === "drive_folders" ? "Create folders" : "Accept"}
                    </button>
                  )}
                  <button type="button" style={ghost} onClick={() => setHidden((h) => new Set(h).add(s.key))}>Not now</button>
                </div>
              ))}

              {pendingDrafts.length > 0 && (
                <>
                  <h3 style={{ margin: "22px 0 6px", fontSize: 15 }}>Drafts waiting for your review</h3>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, fontSize: 13 }}>
                    Approving as
                    <input type="text" value={reviewer} onChange={(e) => setReviewer(e.target.value)} style={{ maxWidth: 200 }} aria-label="Your name" />
                  </div>
                  {pendingDrafts.map((d) => (
                    <div key={d.id} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 14, marginBottom: 12 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>
                        {HELPER_NAMES[d.helper] || d.helper} · for {episodeName(d.episode_id)} · drafted {fmt(d.created_at)}
                      </p>
                      <p style={{ margin: "0 0 8px", fontWeight: 700 }}>{d.title}</p>
                      <textarea value={edits[d.id] ?? d.content} onChange={(e) => setEdits({ ...edits, [d.id]: e.target.value })}
                        style={{ minHeight: 220, fontSize: 13.5, lineHeight: 1.55 }} />
                      <p className="hint" style={{ margin: "6px 0 8px" }}>
                        Read it, fix anything that&apos;s off, then approve. Approving copies it so you can paste it into an email draft or send it to the host — Podforge doesn&apos;t send anything.
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" disabled={busy === `approve:${d.id}` || busy === `dismiss:${d.id}` || !reviewer.trim()}
                          onClick={async () => {
                            const content = edits[d.id] ?? d.content;
                            const r = await call(`approve:${d.id}`, `/api/assistant/drafts/${d.id}`, "PATCH", { action: "approve", reviewer, content });
                            if (r) { navigator.clipboard.writeText(content); setCopied(d.id); setTimeout(() => setCopied(null), 2500); }
                          }}>
                          {busy === `approve:${d.id}` ? "Saving…" : "Approve & copy"}
                        </button>
                        <button type="button" style={ghost} disabled={busy === `approve:${d.id}` || busy === `dismiss:${d.id}`}
                          onClick={() => call(`dismiss:${d.id}`, `/api/assistant/drafts/${d.id}`, "PATCH", { action: "dismiss" })}>
                          {busy === `dismiss:${d.id}` ? "Dismissing…" : "Dismiss"}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {copied && <p style={{ color: "#0E8A50", fontWeight: 700, fontSize: 14 }}>✅ Approved and copied to your clipboard.</p>}
            </div>

            {/* ---------- INVITE A GUEST ---------- */}
            <div className="section">
              <h2 style={{ marginTop: 0 }}>Invite a new guest</h2>
              <p className="hint" style={{ marginTop: 0 }}>
                The Outreach Drafter writes Luke&apos;s invitation from the standard template, adding one personal line
                based only on your notes. It appears above for review — send it from Luke&apos;s account yourself.
              </p>
              <div className="field">
                <label>Their name</label>
                <input type="text" value={prospect} onChange={(e) => setProspect(e.target.value)} placeholder="e.g. Kyle Poyar" />
              </div>
              <div className="field">
                <label>Notes about them (facts only)</label>
                <textarea value={prospectNotes} onChange={(e) => setProspectNotes(e.target.value)} style={{ minHeight: 90 }}
                  placeholder="e.g. Writes Growth Unhinged; published a 2026 survey of 230 B2B software and AI companies on pricing and AI monetization." />
              </div>
              <button type="button" disabled={busy === "outreach" || !prospect.trim()}
                onClick={async () => { const r = await call("outreach", "/api/assistant/outreach", "POST", { name: prospect, notes: prospectNotes }); if (r) { setProspect(""); setProspectNotes(""); } }}>
                {busy === "outreach" ? "Drafting…" : "Draft invitation"}
              </button>
            </div>

            {/* ---------- EPISODES ---------- */}
            <div className="section">
              <h2 style={{ marginTop: 0 }}>Episodes</h2>
              {data.episodes.length === 0 && <p className="hint">No episodes tracked yet. Start one from a new intake above, or add one below.</p>}
              {STAGES.map((st) => {
                const eps = data.episodes.filter((e) => e.stage === st.key);
                if (!eps.length) return null;
                return (
                  <div key={st.key} style={{ marginBottom: 16 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {st.label} ({eps.length}) · next: {st.next}
                    </p>
                    {eps.map((e) => (
                      <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
                        <span style={{ flex: 1, minWidth: 200, fontSize: 14 }}>
                          <strong>{e.guest_name}</strong>
                          <span style={{ color: "var(--ink-soft)" }}>
                            {e.episode_number ? ` · ${e.episode_number}` : ""} · host {hostByKey(e.host_key).firstName}
                          </span>
                          {e.guest_kit_slug && <> · <a href={`/admin/guest-kits/${e.guest_kit_slug}`}>guest kit</a></>}
                          {e.intake_id && <> · <a href="/admin/submissions">intake</a></>}
                          {e.drive_folder_id && <> · <a href={`https://drive.google.com/drive/folders/${e.drive_folder_id}`} target="_blank" rel="noreferrer">Drive ↗</a></>}
                        </span>
                        {e.guest_kit_slug && (
                          <button type="button" style={{ ...ghost, ...(e.guest_posted_at ? { background: "#ECFDF3", color: "#0E8A50" } : {}) }}
                            onClick={() => call(`posted:${e.id}`, `/api/episodes/${e.id}`, "PATCH", { guest_posted: !e.guest_posted_at })}>
                            {e.guest_posted_at ? "Guest posted ✅" : "Mark guest posted"}
                          </button>
                        )}
                        <select value={e.stage} aria-label={`Stage for ${e.guest_name}`} style={{ width: "auto", fontSize: 12.5 }}
                          onChange={(ev) => call(`stage:${e.id}`, `/api/episodes/${e.id}`, "PATCH", { stage: ev.target.value })}>
                          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <input type="text" value={newGuest} onChange={(e) => setNewGuest(e.target.value)} placeholder="Guest name (episode with no intake)" style={{ flex: 1, minWidth: 200 }} />
                <input type="text" value={newEp} onChange={(e) => setNewEp(e.target.value)} placeholder="Ep-XX" style={{ width: 100 }} />
                <button type="button" disabled={!newGuest.trim() || busy === "new"}
                  onClick={async () => { const r = await call("new", "/api/episodes", "POST", { guest_name: newGuest, episode_number: newEp }); if (r) { setNewGuest(""); setNewEp(""); } }}>
                  Add episode
                </button>
              </div>
            </div>

            {/* ---------- ACTIVITY ---------- */}
            <div className="section">
              <h2 style={{ marginTop: 0 }}>Agent activity</h2>
              <p className="hint" style={{ marginTop: 0 }}>Everything the helpers drafted, and what happened to it.</p>
              {data.drafts.length === 0 && <p className="hint">Nothing drafted yet.</p>}
              {data.drafts.slice(0, 25).map((d) => (
                <p key={d.id} style={{ fontSize: 13, margin: "4px 0" }}>
                  {fmt(d.created_at)} · <strong>{HELPER_NAMES[d.helper] || d.helper}</strong> · {d.title} ·{" "}
                  <span style={{ fontWeight: 700, color: d.status === "approved" ? "#0E8A50" : d.status === "dismissed" ? "#9AA4AF" : "#B54708" }}>
                    {d.status === "approved" ? `approved by ${d.reviewed_by}` : d.status}
                  </span>
                </p>
              ))}
            </div>
          </>
        )}
        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
