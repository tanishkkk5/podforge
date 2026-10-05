"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TOPICS } from "@/lib/topics";
import { drivePreviewUrl } from "@/lib/drive";
import { frameworkByName } from "@/lib/frameworks";

interface Item {
  id: string;
  created_at: string;
  kind: "episode" | "clip";
  title: string;
  episode_label: string | null;
  guest_name: string | null;
  parent_id: string | null;
  video_url: string | null;
  summary: string | null;
  topics: string[];
  tag_status: string;
  frameworks?: string[];
}

interface QueueRow {
  name: string;
  state: "waiting" | "saving" | "rate-wait" | "done" | "error";
  note?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Strips SRT/VTT numbering + timestamps so only the spoken words remain. */
function cleanTranscriptFile(text: string): string {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => {
      const l = line.trim();
      if (!l) return true;
      if (/^WEBVTT/i.test(l)) return false;
      if (/^\d+$/.test(l)) return false;
      if (/-->/.test(l)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titleFromFile(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
}

const chip: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999,
  fontSize: 12, fontWeight: 600, background: "#E6F4FC", color: "var(--af-navy)", border: "1px solid #BFE3F7",
};
const ghostBtn: React.CSSProperties = { background: "#F0F3F6", color: "var(--af-navy)", padding: "6px 12px", fontSize: 12.5 };

export default function ContentLibraryPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [qLive, setQLive] = useState("");

  // add form
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [fKind, setFKind] = useState<"episode" | "clip">("episode");
  const [fTitle, setFTitle] = useState("");
  const [fEp, setFEp] = useState("");
  const [fGuest, setFGuest] = useState("");
  const [fParent, setFParent] = useState("");
  const [fVideo, setFVideo] = useState("");
  const [fTranscript, setFTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // bulk
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);

  // per-item UI
  const [watching, setWatching] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [videoDraft, setVideoDraft] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (topic) params.set("topic", topic);
      if (kind) params.set("kind", kind);
      if (q) params.set("q", q);
      const [res, epRes] = await Promise.all([
        fetch(`/api/library?${params}`),
        fetch(`/api/library?kind=episode`),
      ]);
      const body = await res.json();
      const epBody = await epRes.json();
      if (!res.ok) throw new Error(body.error || "Could not load the library.");
      setItems(body.items);
      setAllEpisodes(epRes.ok ? epBody.items : []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [topic, kind, q]);

  useEffect(() => { load(); }, [load]);

  const episodeTitle = useMemo(() => {
    const m = new Map<string, string>();
    allEpisodes.forEach((e) => m.set(e.id, [e.episode_label, e.title].filter(Boolean).join(" · ")));
    return m;
  }, [allEpisodes]);

  /** Saves one item; if Groq is rate-limited, waits a minute and retries tagging. */
  async function saveOne(payload: any, onWait?: (secs: number) => void): Promise<{ ok: boolean; note?: string }> {
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) return { ok: false, note: body.error || "Save failed." };
    if (body.tagError) return { ok: true, note: `Saved, but tagging failed: ${body.tagError}` };
    let attempt = 0;
    let rateLimited = body.rateLimited;
    while (rateLimited && attempt < 3) {
      attempt++;
      for (let s = 65; s > 0; s -= 5) { onWait?.(s); await sleep(5000); }
      const r = await fetch(`/api/library/${body.item.id}/tag`, { method: "POST" });
      const rb = await r.json();
      if (!r.ok) return { ok: true, note: `Saved, but tagging failed: ${rb.error}` };
      rateLimited = rb.rateLimited;
    }
    return rateLimited ? { ok: true, note: "Saved — tagging still waiting on Groq, use Retry tagging later." } : { ok: true };
  }

  async function handleSingle(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    const r = await saveOne(
      { kind: fKind, title: fTitle, episode_label: fEp, guest_name: fGuest, parent_id: fParent, video_url: fVideo, transcript: fTranscript },
      (s) => setSaveMsg(`Groq free-tier limit hit — retrying tagging in ${s}s…`)
    );
    setSaving(false);
    if (!r.ok) { setSaveMsg(`❌ ${r.note}`); return; }
    setSaveMsg(r.note ? `⚠️ ${r.note}` : "✅ Saved and tagged.");
    setFTitle(""); setFTranscript(""); setFVideo("");
    load();
  }

  async function loadSingleFile(file: File | undefined) {
    if (!file) return;
    setFTranscript(cleanTranscriptFile(await file.text()));
    if (!fTitle) setFTitle(titleFromFile(file.name));
  }

  async function handleBulk(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setQueue(list.map((f) => ({ name: f.name, state: "waiting" })));
    setBulkRunning(true);
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const setRow = (patch: Partial<QueueRow>) =>
        setQueue((qq) => qq.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
      setRow({ state: "saving" });
      const transcript = cleanTranscriptFile(await f.text());
      const r = await saveOne(
        { kind: fKind, title: titleFromFile(f.name), episode_label: fEp, guest_name: fGuest, parent_id: fParent, transcript },
        (s) => setRow({ state: "rate-wait", note: `Groq limit — retrying in ${s}s` })
      );
      setRow({ state: r.ok ? "done" : "error", note: r.note });
    }
    setBulkRunning(false);
    load();
  }

  async function patchItem(id: string, patch: any) {
    const res = await fetch(`/api/library/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json();
    if (!res.ok) { setError(body.error || "Save failed."); return; }
    setItems((its) => its?.map((it) => (it.id === id ? { ...it, ...body.item } : it)) || null);
  }

  async function retag(id: string) {
    setItems((its) => its?.map((it) => (it.id === id ? { ...it, tag_status: "pending" } : it)) || null);
    const res = await fetch(`/api/library/${id}/tag`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) setError(body.error || "Tagging failed.");
    else if (body.rateLimited) setError("Groq free-tier limit reached — wait about a minute, then press Retry tagging again.");
    load();
  }

  async function remove(it: Item) {
    if (!confirm(`Delete "${it.title}" from the library? (The video in Drive is not touched.)`)) return;
    await fetch(`/api/library/${it.id}`, { method: "DELETE" });
    load();
  }

  // AI helper scorecard (knowledge/skills/content-library-tagger.md):
  // how often a human had to correct the Tagger's topics.
  const score = useMemo(() => {
    const done = (items || []).filter((it) => it.tag_status === "tagged" || it.tag_status === "edited");
    const fixed = done.filter((it) => it.tag_status === "edited").length;
    return { total: done.length, fixed, pct: done.length ? Math.round((fixed / done.length) * 100) : 0 };
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (items || []).forEach((it) => it.topics.forEach((t) => (c[t] = (c[t] || 0) + 1)));
    return c;
  }, [items]);

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>Content Library</h1>
          <p>Every episode and clip, auto-tagged by topic. Videos play straight from Google Drive.</p>
        </div>
      </header>

      <div className="wrap" style={{ padding: "8px 24px 100px" }}>
        {error && <div className="error-banner">{error}</div>}

        {/* ---------- ADD ---------- */}
        <div className="section">
          <h2>Add content</h2>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["single", "bulk"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                style={{ ...ghostBtn, ...(mode === m ? { background: "var(--af-navy)", color: "#fff" } : {}) }}>
                {m === "single" ? "One at a time" : "Bulk upload files"}
              </button>
            ))}
          </div>

          <div className="field">
            <label>Type</label>
            <div style={{ display: "flex", gap: 16 }}>
              {(["episode", "clip"] as const).map((k) => (
                <label key={k} style={{ fontWeight: 400, display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="radio" checked={fKind === k} onChange={() => setFKind(k)} style={{ width: "auto" }} />
                  {k === "episode" ? "Full episode" : "Short clip"}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Episode number</label>
              <input type="text" value={fEp} onChange={(e) => setFEp(e.target.value)} placeholder="e.g. Ep-50" />
            </div>
            <div className="field">
              <label>Guest name</label>
              <input type="text" value={fGuest} onChange={(e) => setFGuest(e.target.value)} />
            </div>
          </div>

          {fKind === "clip" && (
            <div className="field">
              <label>Clip of which episode? (optional)</label>
              <select value={fParent} onChange={(e) => setFParent(e.target.value)}>
                <option value="">— not linked —</option>
                {allEpisodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>{[ep.episode_label, ep.title].filter(Boolean).join(" · ")}</option>
                ))}
              </select>
            </div>
          )}

          {mode === "single" ? (
            <form onSubmit={handleSingle}>
              <div className="field">
                <label>Title</label>
                <input type="text" value={fTitle} onChange={(e) => setFTitle(e.target.value)} required />
              </div>
              <div className="field">
                <label>Google Drive video link (optional)</label>
                <p className="sub">In Drive: right-click the video → Share → set to &quot;Anyone with the link&quot; → Copy link.</p>
                <input type="text" value={fVideo} onChange={(e) => setFVideo(e.target.value)} placeholder="https://drive.google.com/file/d/…/view" />
                {fVideo && !drivePreviewUrl(fVideo) && (
                  <p className="sub" style={{ color: "#B42318" }}>That doesn&apos;t look like a Drive <em>file</em> link (folder links can&apos;t play).</p>
                )}
              </div>
              <div className="field">
                <label>Transcript</label>
                <p className="sub">Paste it, or load a .txt / .srt / .vtt file. For a Google Doc: File → Download → Plain text (.txt).</p>
                <input type="file" accept=".txt,.srt,.vtt,.md" onChange={(e) => loadSingleFile(e.target.files?.[0])} style={{ marginBottom: 8 }} />
                <textarea value={fTranscript} onChange={(e) => setFTranscript(e.target.value)} required style={{ minHeight: 160 }} />
              </div>
              <button type="submit" disabled={saving}>{saving ? "Saving & tagging…" : "Save & auto-tag"}</button>
              {saveMsg && <p style={{ marginTop: 10, fontSize: 14 }}>{saveMsg}</p>}
            </form>
          ) : (
            <div>
              <div className="field">
                <label>Transcript files</label>
                <p className="sub">
                  Select many .txt / .srt / .vtt files at once. Each file becomes one item, titled from its file name.
                  The episode number, guest and type above apply to all of them. Add Drive video links afterwards in the list below.
                  Long episodes are tagged about one per minute (Groq free-tier limit) — just leave this tab open.
                </p>
                <input type="file" multiple accept=".txt,.srt,.vtt,.md" disabled={bulkRunning} onChange={(e) => handleBulk(e.target.files)} />
              </div>
              {queue.length > 0 && (
                <div style={{ fontSize: 13.5 }}>
                  {queue.map((row, i) => (
                    <div key={i} style={{ padding: "5px 0", borderBottom: "1px solid var(--line)", display: "flex", gap: 10 }}>
                      <span style={{ width: 22 }}>
                        {{ waiting: "⏳", saving: "🔄", "rate-wait": "⏸️", done: "✅", error: "❌" }[row.state]}
                      </span>
                      <span style={{ flex: 1 }}>{row.name}</span>
                      {row.note && <span style={{ color: "var(--ink-soft)" }}>{row.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---------- BROWSE ---------- */}
        <div className="section">
          <h2>Browse by topic</h2>
          {score.total > 0 && (
            <p style={{ fontSize: 13.5, margin: "-4px 0 14px", padding: "8px 12px", background: "#F5FAFE", borderRadius: 8 }}>
              <strong>AI Tagger scorecard{topic || kind || q ? " (this view)" : ""}:</strong> a person corrected the topics on{" "}
              {score.fixed} of {score.total} items ({score.pct}%).{" "}
              {score.total < 10
                ? "Too few items yet to judge — keep checking every tag."
                : score.pct <= 10
                ? "Low — the Tagger is earning trust."
                : score.pct <= 30
                ? "Moderate — keep checking tags."
                : "High — its instructions need improving."}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <button type="button" onClick={() => setTopic("")}
              style={{ ...ghostBtn, ...(topic === "" ? { background: "var(--af-navy)", color: "#fff" } : {}) }}>
              All topics
            </button>
            {TOPICS.map((t) => (
              <button key={t} type="button" onClick={() => setTopic(t)}
                style={{ ...ghostBtn, ...(topic === t ? { background: "var(--af-navy)", color: "#fff" } : {}) }}>
                {t}{!topic && counts[t] ? ` (${counts[t]})` : ""}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: 170 }}>
              <option value="">Episodes &amp; clips</option>
              <option value="episode">Episodes only</option>
              <option value="clip">Clips only</option>
            </select>
            <input type="text" value={qLive} placeholder="Search titles, guests or words said in the transcript…"
              onChange={(e) => setQLive(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setQ(qLive); }} style={{ flex: 1 }} />
            <button type="button" onClick={() => setQ(qLive)}>Search</button>
          </div>

          {!items && !error && <p className="hint">Loading…</p>}
          {items && items.length === 0 && <p className="hint">Nothing here yet{topic || kind || q ? " for this filter" : ""}.</p>}

          {items?.map((it) => {
            const preview = drivePreviewUrl(it.video_url);
            return (
              <div key={it.id} style={{ borderTop: "1px solid var(--line)", padding: "14px 0" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: it.kind === "clip" ? "#B54708" : "var(--af-navy)" }}>
                    {it.kind === "clip" ? "CLIP" : "EPISODE"}
                  </span>
                  <strong style={{ fontSize: 15 }}>{it.title}</strong>
                  <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                    {[it.episode_label, it.guest_name].filter(Boolean).join(" · ")}
                    {it.parent_id && episodeTitle.get(it.parent_id) ? ` · from ${episodeTitle.get(it.parent_id)}` : ""}
                  </span>
                </div>
                {it.summary && <p style={{ margin: "6px 0", fontSize: 13.5, color: "var(--ink-soft)" }}>{it.summary}</p>}
                {it.frameworks && it.frameworks.length > 0 && (
                  <p style={{ margin: "4px 0", fontSize: 12.5 }}>
                    Mentions:{" "}
                    {it.frameworks.map((n, i) => {
                      const f = frameworkByName(n);
                      return (
                        <span key={n}>
                          {i > 0 && ", "}
                          {f ? <a href={f.url} target="_blank" rel="noreferrer">{n} ↗</a> : n}
                        </span>
                      );
                    })}
                  </p>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", margin: "8px 0" }}>
                  {it.tag_status === "pending" && <span style={{ fontSize: 12.5 }}>🔄 Tagging…</span>}
                  {it.tag_status === "failed" && <span style={{ fontSize: 12.5, color: "#B42318" }}>Tagging failed</span>}
                  {it.topics.map((t) => (
                    <span key={t} style={chip}>
                      {t}
                      <button type="button" aria-label={`Remove ${t}`}
                        onClick={() => patchItem(it.id, { topics: it.topics.filter((x) => x !== t) })}
                        style={{ background: "none", color: "var(--af-navy)", padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                  <select value="" onChange={(e) => e.target.value && patchItem(it.id, { topics: [...it.topics, e.target.value] })}
                    style={{ width: "auto", fontSize: 12, padding: "3px 6px" }}>
                    <option value="">+ topic</option>
                    {TOPICS.filter((t) => !it.topics.includes(t)).map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {preview ? (
                    <button type="button" style={ghostBtn} onClick={() => setWatching(watching === it.id ? null : it.id)}>
                      {watching === it.id ? "Hide video" : "▶ Watch"}
                    </button>
                  ) : null}
                  <button type="button" style={ghostBtn} onClick={() => { setEditingVideo(it.id); setVideoDraft(it.video_url || ""); }}>
                    {it.video_url ? "Change video link" : "+ Add Drive video link"}
                  </button>
                  {it.video_url && (
                    <a href={it.video_url} target="_blank" rel="noreferrer"><button type="button" style={ghostBtn}>Open in Drive ↗</button></a>
                  )}
                  <button type="button" style={ghostBtn} onClick={() => retag(it.id)}>Retry tagging</button>
                  <button type="button" style={{ ...ghostBtn, color: "#B42318" }} onClick={() => remove(it)}>Delete</button>
                </div>

                {editingVideo === it.id && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <input type="text" value={videoDraft} onChange={(e) => setVideoDraft(e.target.value)}
                      placeholder="https://drive.google.com/file/d/…/view" style={{ flex: 1, fontSize: 13 }} />
                    <button type="button" onClick={async () => { await patchItem(it.id, { video_url: videoDraft }); setEditingVideo(null); }}>Save</button>
                    <button type="button" style={ghostBtn} onClick={() => setEditingVideo(null)}>Cancel</button>
                  </div>
                )}
                {editingVideo === it.id && videoDraft && !drivePreviewUrl(videoDraft) && (
                  <p className="sub" style={{ color: "#B42318", marginTop: 6 }}>Needs a Drive <em>file</em> link (folder links can&apos;t play).</p>
                )}

                {watching === it.id && preview && (
                  <div style={{ marginTop: 12, position: "relative", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden", background: "#000" }}>
                    <iframe src={preview} allow="autoplay; fullscreen" allowFullScreen title={it.title}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
