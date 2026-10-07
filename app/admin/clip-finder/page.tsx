"use client";

import { useEffect, useState } from "react";
import { buildBlocks, chunkBlocks, formatTime, hasExactTimings, parseCaptions } from "@/lib/captions";
import { Clip, clipsAsText, selectTopClips } from "@/lib/helpers/clipFinder";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ClipFinderPage() {
  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const [guest, setGuest] = useState("");
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [clips, setClips] = useState<Clip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setEpisodeId(q.get("episode"));
    if (q.get("guest")) setGuest(q.get("guest")!);
  }, []);

  const cues = parseCaptions(raw);
  const length = cues.length ? cues[cues.length - 1].end : 0;

  async function run() {
    setError(null);
    setClips(null);
    setSaved(false);
    if (!cues.length) {
      setError("No timestamps found. From Riverside, export the transcript as .srt, or as .txt WITH speaker timestamps — the Clip Finder needs the times.");
      return;
    }
    const chunks = chunkBlocks(buildBlocks(cues));
    setRunning(true);
    const found: Clip[] = [];
    try {
      for (let i = 0; i < chunks.length; i++) {
        let attempt = 0;
        while (true) {
          setStatus(`Reading part ${i + 1} of ${chunks.length}…`);
          const res = await fetch("/api/clips/chunk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blocks: chunks[i], guest }),
          });
          const body = await res.json();
          if (res.status === 429 && attempt < 3) {
            attempt++;
            for (let s = 65; s > 0; s -= 5) { setStatus(`Groq free-tier limit — continuing part ${i + 1} in ${s}s (keep this tab open)…`); await sleep(5000); }
            continue;
          }
          if (!res.ok) throw new Error(body.error || "Clip search failed.");
          found.push(...body.clips);
          break;
        }
      }
      setClips(selectTopClips(found, 5));
      setStatus(null);
    } catch (e: any) {
      setError(e.message);
      setStatus(null);
    } finally {
      setRunning(false);
    }
  }

  async function saveForReview() {
    if (!clips) return;
    const res = await fetch("/api/assistant/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        helper: "clip_finder",
        episode_id: episodeId,
        title: `Clip suggestions: ${guest || fileName || "episode"}`,
        content: clipsAsText(clips, guest),
      }),
    });
    const body = await res.json();
    if (!res.ok) setError(body.error || "Could not save.");
    else setSaved(true);
  }

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>Clip Finder</h1>
          <p>Upload Riverside&apos;s captions file and get the 5 best moments to cut — with exact times from the file itself.</p>
        </div>
      </header>

      <div className="wrap" style={{ padding: "8px 24px 100px" }}>
        {error && <div className="error-banner">{error}</div>}

        <div className="section">
          <div className="field">
            <label>Guest name</label>
            <input type="text" value={guest} onChange={(e) => setGuest(e.target.value)} />
          </div>
          <div className="field">
            <label>Riverside transcript file (.srt, or .txt with timestamps)</label>
            <p className="sub">In Riverside: open the recording → Export → Transcript → <strong>SRT</strong> (most precise) or <strong>TXT with timestamps</strong>.</p>
            <input type="file" accept=".srt,.vtt,.txt" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setFileName(f.name);
              setRaw(await f.text());
              setClips(null);
            }} />
          </div>
          {raw && (
            <p style={{ fontSize: 13.5 }}>
              {cues.length
                ? `✅ ${cues.length} timed lines found · episode length ${formatTime(length)}${hasExactTimings(raw) ? "" : " · times estimated from speaker timestamps (within a few seconds)"}`
                : "⚠️ No timestamps found in this file — export it from Riverside as .srt, or .txt with timestamps."}
            </p>
          )}
          <button type="button" onClick={run} disabled={running || !raw}>{running ? "Finding clips…" : "Find the best clips"}</button>
          {status && <p style={{ fontSize: 13.5, marginTop: 10 }}>{status}</p>}
        </div>

        {clips && (
          <div className="section">
            <h2 style={{ marginTop: 0 }}>Suggested clips</h2>
            <p className="hint" style={{ marginTop: 0 }}>
              Times come from Riverside&apos;s file{hasExactTimings(raw) ? "" : " (estimated within speaker turns — check a few seconds either side)"}. Watch each moment before cutting — the AI picked them, a person decides.
            </p>
            {clips.length === 0 && <p>No strong standalone moments found.</p>}
            {clips.map((c, i) => (
              <div key={i} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700 }}>
                  {i + 1}. {formatTime(c.start)}–{formatTime(c.end)}{" "}
                  <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>({Math.round(c.end - c.start)}s) · score {c.score}/10</span>
                </p>
                <p style={{ margin: "0 0 4px", fontSize: 15 }}>{c.title}</p>
                <p style={{ margin: "0 0 4px", fontSize: 13.5, color: "var(--ink-soft)" }}>{c.why}</p>
                <p style={{ margin: 0, fontSize: 13, fontStyle: "italic" }}>Starts with: &ldquo;{c.opening}&rdquo;</p>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button type="button" onClick={saveForReview} disabled={saved}>
                {saved ? "✅ Saved — review it in Production Assistant" : "Save for review in Production Assistant"}
              </button>
              <button type="button" style={{ background: "#F0F3F6", color: "var(--af-navy)" }}
                onClick={() => { navigator.clipboard.writeText(clipsAsText(clips, guest)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? "Copied!" : "Copy list"}
              </button>
            </div>
            {saved && <p style={{ marginTop: 8 }}><a href="/admin/assistant">→ Open Production Assistant</a></p>}
          </div>
        )}
        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
