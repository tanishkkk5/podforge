"use client";

import { useEffect, useMemo, useState } from "react";
import { buildBlocks, chunkBlocks, formatTime, parseCaptions } from "@/lib/captions";
import { Clip, clipsAsText, selectTopClips } from "@/lib/helpers/clipFinder";
import { Chapter, captionsToText, chaptersAsText, finalizeChapters } from "@/lib/helpers/episodeScan";
import { hostByKey } from "@/lib/hosts";

interface Ep { id: string; guest_name: string; episode_number: string | null; host_key: string; stage: string; guest_kit_slug: string | null }
interface DropFile { id: string; name: string; modifiedTime: string; processed: boolean }
type StepState = "waiting" | "running" | "done" | "error" | "skipped";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const STEP_LABELS = ["Read the Riverside file", "Find chapters and clips", "Generate the guest kit (draft)", "Save everything for review"];

export default function EpisodePipelinePage() {
  const [episodes, setEpisodes] = useState<Ep[]>([]);
  const [episodeId, setEpisodeId] = useState("");
  const [epNumber, setEpNumber] = useState("");
  const [files, setFiles] = useState<DropFile[] | null>(null);
  const [driveNote, setDriveNote] = useState<string | null>(null);
  const [fileId, setFileId] = useState("");
  const [upload, setUpload] = useState<{ name: string; text: string } | null>(null);
  const [steps, setSteps] = useState<StepState[]>(STEP_LABELS.map(() => "waiting"));
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ chapters: Chapter[]; clips: Clip[]; slug: string | null; truncated?: boolean } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("episode")) setEpisodeId(q.get("episode")!);
    if (q.get("file")) setFileId(q.get("file")!);
    fetch("/api/assistant", { cache: "no-store" }).then((r) => r.json()).then((b) => setEpisodes(b.episodes || [])).catch(() => {});
    fetch("/api/drive/drop", { cache: "no-store" }).then(async (r) => {
      const b = await r.json();
      if (r.ok) setFiles(b.files); else setDriveNote(b.error);
    }).catch(() => setDriveNote("Couldn't reach the Drive drop folder."));
  }, []);

  const ep = useMemo(() => episodes.find((e) => e.id === episodeId) || null, [episodes, episodeId]);
  useEffect(() => { if (ep) setEpNumber(ep.episode_number || ""); }, [ep]);
  const setStep = (i: number, st: StepState) => setSteps((s) => s.map((v, j) => (j === i ? st : v)));

  async function withRetry(fn: () => Promise<Response>, label: string): Promise<any> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fn();
      const body = await res.json().catch(() => ({}));
      if (res.ok) return body;
      const limited = res.status === 429 || /rate|limit|413|429|tokens per minute/i.test(String(body.error || ""));
      if (!limited || attempt === 3) throw new Error(body.error || `${label} failed.`);
      for (let s = 65; s > 0; s -= 5) { setStatus(`Free AI limit reached — continuing "${label}" in ${s}s (keep this tab open)…`); await sleep(5000); }
    }
  }

  async function run() {
    setError(null);
    setResult(null);
    setSteps(STEP_LABELS.map(() => "waiting"));
    if (!ep) return setError("Choose the episode first.");
    if (!epNumber.trim()) return setError("Add the episode number — the guest kit needs it.");
    if (!fileId && !upload) return setError("Choose a file from the drop folder, or upload the .srt.");
    setRunning(true);
    try {
      // Save the episode number if it was just added
      if (epNumber.trim() !== (ep.episode_number || "")) {
        await fetch(`/api/episodes/${ep.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ episode_number: epNumber.trim() }) });
      }

      // 1. Read
      setStep(0, "running");
      setStatus("Reading the Riverside file…");
      const file = upload || (await withRetry(() => fetch(`/api/drive/file?id=${encodeURIComponent(fileId)}`), "Read file"));
      const cues = parseCaptions(file.text);
      if (!cues.length) throw new Error("No timestamps in that file — from Riverside, export the transcript as .srt, or .txt with speaker timestamps.");
      const blocks = buildBlocks(cues);
      const chunks = chunkBlocks(blocks);
      setStep(0, "done");

      // 2. Chapters + clips (one free AI call per part)
      setStep(1, "running");
      const allChapters: Chapter[] = [];
      const allClips: Clip[] = [];
      for (let i = 0; i < chunks.length; i++) {
        setStatus(`Reading part ${i + 1} of ${chunks.length} for chapters and clips…`);
        const r = await withRetry(() => fetch("/api/pipeline/scan", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks: chunks[i], guest: ep.guest_name, isFirst: i === 0 }),
        }), `Part ${i + 1}`);
        allChapters.push(...r.chapters);
        allClips.push(...r.clips);
      }
      const chapters = finalizeChapters(allChapters);
      const clips = selectTopClips(allClips, 5);
      setStep(1, "done");

      // 3. Guest kit — the biggest AI call, so give the free tier a minute to reset first
      setStep(2, "running");
      for (let s = 60; s > 0; s -= 5) { setStatus(`Giving the free AI a minute to reset before the guest kit… ${s}s`); await sleep(5000); }
      setStatus("Generating the guest kit (about 30–60 seconds)…");
      const fd = new FormData();
      fd.append("transcript", captionsToText(blocks));
      fd.append("guestName", ep.guest_name);
      fd.append("hostName", hostByKey(ep.host_key).name);
      fd.append("episodeNumber", epNumber.trim());
      fd.append("chapters", chaptersAsText(chapters));
      const kit = await withRetry(() => fetch("/api/guestkit/generate", { method: "POST", body: fd }), "Guest kit");
      setStep(2, "done");

      // 4. Save for review: link the kit, save clip suggestions, mark the file processed
      setStep(3, "running");
      setStatus("Saving for review…");
      await fetch(`/api/episodes/${ep.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guest_kit_slug: kit.slug }) });
      await fetch("/api/assistant/drafts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helper: "clip_finder", episode_id: ep.id, title: `Clip suggestions: ${ep.guest_name}`, content: clipsAsText(clips, ep.guest_name) }),
      });
      if (fileId && !upload) {
        await fetch("/api/pipeline/done", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file_id: fileId, name: file.name, episode_id: ep.id }) });
      }
      setStep(3, "done");
      setStatus(null);
      setResult({ chapters, clips, slug: kit.slug, truncated: !!kit.content?.truncated });
    } catch (e: any) {
      setError(e.message);
      setStatus(null);
      setSteps((s) => s.map((v) => (v === "running" ? "error" : v)));
    } finally {
      setRunning(false);
    }
  }

  const icon: Record<StepState, string> = { waiting: "⏳", running: "🔄", done: "✅", error: "❌", skipped: "➖" };

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>Episode Pipeline</h1>
          <p>One Riverside .srt in → chapters, guest kit, show notes and clip suggestions out. Everything lands as a draft for your review.</p>
        </div>
      </header>

      <div className="wrap" style={{ padding: "8px 24px 100px" }}>
        {error && <div className="error-banner">{error}</div>}

        <div className="section">
          <div className="field">
            <label>Episode</label>
            <select value={episodeId} onChange={(e) => setEpisodeId(e.target.value)} disabled={running}>
              <option value="">— choose —</option>
              {episodes.filter((e) => e.stage !== "published").map((e) => (
                <option key={e.id} value={e.id}>{e.guest_name}{e.episode_number ? ` · ${e.episode_number}` : ""}{e.guest_kit_slug ? " · has a kit already" : ""}</option>
              ))}
            </select>
            {ep?.guest_kit_slug && <p className="sub" style={{ color: "#B54708" }}>This episode already has a guest kit — running again replaces it with a new draft.</p>}
          </div>
          <div className="field">
            <label>Episode number</label>
            <input type="text" value={epNumber} onChange={(e) => setEpNumber(e.target.value)} placeholder="e.g. 52" style={{ maxWidth: 160 }} disabled={running} />
          </div>

          <div className="field">
            <label>Riverside file</label>
            {driveNote ? (
              <p className="sub">Drive drop folder: {driveNote} — you can upload the file below instead.</p>
            ) : files === null ? (
              <p className="sub">Checking the Drive drop folder…</p>
            ) : (
              <select value={fileId} onChange={(e) => { setFileId(e.target.value); setUpload(null); }} disabled={running}>
                <option value="">— choose a file from the drop folder —</option>
                {files.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}{f.processed ? " (already processed)" : ""}</option>
                ))}
              </select>
            )}
            <p className="sub" style={{ marginTop: 8 }}>…or upload it directly (Riverside → Export → Transcript → <strong>SRT</strong>, or <strong>TXT with timestamps</strong>):</p>
            <input type="file" accept=".srt,.vtt,.txt" disabled={running} onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) { setUpload({ name: f.name, text: await f.text() }); setFileId(""); }
            }} />
          </div>

          <button type="button" onClick={run} disabled={running}>{running ? "Working…" : "Run the pipeline"}</button>
          <p className="hint" style={{ marginTop: 8 }}>A 1-hour episode takes about 6–10 minutes on the free AI tier. Keep this tab open.</p>
        </div>

        <div className="section">
          {STEP_LABELS.map((l, i) => (
            <p key={l} style={{ margin: "6px 0", fontSize: 14.5 }}>{icon[steps[i]]} {l}</p>
          ))}
          {status && <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 10 }}>{status}</p>}
        </div>

        {result && (
          <div className="section">
            <h2 style={{ marginTop: 0 }}>✅ Drafts ready for your review</h2>
            {result.truncated && <p style={{ color: "#B54708", fontSize: 14 }}>Note: the transcript was long, so the guest kit is based on the first part of it. Chapters and clips cover the whole episode.</p>}
            {result.slug && (
              <p><a href={`/admin/guest-kits/${result.slug}`}><button type="button">Review &amp; approve the guest kit →</button></a></p>
            )}
            <h3 style={{ fontSize: 15 }}>Chapters (already in the show notes)</h3>
            {result.chapters.map((c) => <p key={c.start} style={{ margin: "2px 0", fontSize: 14 }}>{formatTime(c.start)} {c.title}</p>)}
            <h3 style={{ fontSize: 15, marginTop: 16 }}>Clip suggestions (saved in Production Assistant)</h3>
            {result.clips.map((c, i) => <p key={i} style={{ margin: "2px 0", fontSize: 14 }}>{i + 1}. {formatTime(c.start)}–{formatTime(c.end)} — {c.title}</p>)}
            <p style={{ marginTop: 14 }}><a href="/admin/assistant">→ Back to Production Assistant</a></p>
          </div>
        )}
        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
