"use client";

import { useEffect, useMemo, useState } from "react";
import { IconLabel, Search } from "@/app/components/Icons";

interface Guest {
  intakeId: string;
  createdAt: string;
  name: string;
  email: string;
  hostName: string;
  recordedAt: string | null;
  guestTitle: string;
  headshotUrl: string;
  linkedin: string;
  otherLinks: string;
  kitSlug: string | null;
  kitEpisode: string | null;
}
interface Flag { found: string; suggested: string }

const grey = { background: "#F0F3F6", color: "var(--af-navy)" } as const;

function parseChapters(text: string) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean)
    .map((line) => {
      // "00:00 Intro", "(00:00) Intro", "00:00 - Intro", "0:00:00 Intro"
      const m = line.match(/^\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?\s*[-:.]?\s*(.+)$/);
      return m ? { time: m[1], title: m[2].trim() } : null;
    })
    .filter(Boolean) as { time: string; title: string }[];
}

export default function EpisodeStudioStart() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [lastEpisode, setLastEpisode] = useState(0);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const [intakeId, setIntakeId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [hostName, setHostName] = useState("Luke Hohmann");
  const [guestTitle, setGuestTitle] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState("");
  const [headshot, setHeadshot] = useState<File | null>(null);
  const [guestLinkedin, setGuestLinkedin] = useState("");
  const [guestOtherLinks, setGuestOtherLinks] = useState("");
  const [chaptersText, setChaptersText] = useState("");
  const [transcript, setTranscript] = useState("");

  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/production/prefill")
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error || "Could not load guests.");
        setGuests(b.guests || []);
        setLastEpisode(b.lastEpisode || 0);
        setEpisodeNumber((e) => e || String(b.nextEpisode || ""));
      })
      .catch((e) => setLoadErr(e.message));
    // Pre-fill from links (Production Assistant): ?guest=…&ep=…&host=…
    const q = new URLSearchParams(window.location.search);
    if (q.get("guest")) setGuestName(q.get("guest")!);
    if (q.get("ep")) setEpisodeNumber(q.get("ep")!);
    if (q.get("host")) setHostName(q.get("host")!);
  }, []);

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return guests.filter((g) => !f || g.name.toLowerCase().includes(f) || (g.email || "").toLowerCase().includes(f));
  }, [guests, filter]);

  function pick(id: string) {
    setIntakeId(id);
    const g = guests.find((x) => x.intakeId === id);
    if (!g) return;
    setGuestName(g.name);
    setHostName(g.hostName || "Luke Hohmann");
    setGuestTitle(g.guestTitle);
    setHeadshotUrl(g.headshotUrl);
    setGuestLinkedin(g.linkedin);
    setGuestOtherLinks(g.otherLinks);
    if (g.kitEpisode) setEpisodeNumber(g.kitEpisode);
  }

  const chapters = useMemo(() => parseChapters(chaptersText), [chaptersText]);
  const chapterLines = chaptersText.split("\n").filter((l) => l.trim()).length;
  const picked = guests.find((g) => g.intakeId === intakeId);

  async function checkNames() {
    setChecking(true); setCheckMsg(null); setFlags(null);
    try {
      const r = await fetch("/api/tools/transcript-check", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Check failed.");
      setFlags(b.flagged || []);
      if (!(b.flagged || []).length) setCheckMsg("No misspelled names found.");
    } catch (e: any) {
      setCheckMsg(`Error: ${e.message}`);
    } finally { setChecking(false); }
  }

  function applyFix(f: Flag) {
    const esc = f.found.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    setTranscript((t) => t.replace(new RegExp(`\\b${esc}\\b`, "g"), f.suggested));
    setFlags((fl) => (fl || []).filter((x) => x !== f));
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("transcript", transcript);
      fd.append("guestName", guestName);
      fd.append("hostName", hostName);
      fd.append("guestTitle", guestTitle);
      fd.append("episodeNumber", episodeNumber);
      fd.append("chapters", JSON.stringify(chapters));
      fd.append("intakeId", intakeId);
      fd.append("headshotUrl", headshotUrl);
      fd.append("guestLinkedin", guestLinkedin);
      fd.append("guestOtherLinks", guestOtherLinks);
      if (headshot) fd.append("headshot", headshot);
      const r = await fetch("/api/guestkit/generate", { method: "POST", body: fd });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Something went wrong.");
      window.location.href = `/admin/guest-kits/${b.slug}?new=1${b.content?.truncated ? "&truncated=1" : ""}`;
    } catch (err: any) {
      setError(err.message);
      setGenerating(false);
    }
  }

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST · INTERNAL</p>
          <h1>Episode Studio</h1>
          <p>
            Step 1 of 2. Pick the guest, paste the Riverside transcript and chapters, and Podforge drafts the title,
            description, 10 takeaways, resources and the guest kit. Step 2 is where you edit, refresh and approve.
          </p>
        </div>
      </header>

      <div className="wrap">
        <form onSubmit={generate} style={{ paddingBottom: 100 }}>
          {error && <div className="error-banner">{error}</div>}

          <div className="section">
            <h2 style={{ marginTop: 0 }}>1. Guest</h2>
            {loadErr && <div className="error-banner">{loadErr}</div>}
            <div className="field">
              <label>
                Pick from intake forms
                <span className="sub">Fills in name, host, photo, title and links. You can still type below.</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" placeholder="Search name or email" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 220 }} />
                <select value={intakeId} onChange={(e) => pick(e.target.value)} style={{ flex: 1 }}>
                  <option value="">Choose a guest ({shown.length})</option>
                  {shown.map((g) => (
                    <option key={g.intakeId} value={g.intakeId}>
                      {g.name} · host {g.hostName}{g.recordedAt ? ` · recorded ${new Date(g.recordedAt).toLocaleDateString()}` : ""}
                      {g.kitSlug ? ` · kit exists (Ep-${g.kitEpisode})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {picked?.kitSlug && (
                <p className="hint" style={{ marginTop: 6 }}>
                  This guest already has a kit: <a href={`/admin/guest-kits/${picked.kitSlug}`}>open it</a>. Generating again with the same
                  episode number replaces its draft content.
                </p>
              )}
            </div>

            <div className="row2">
              <div className="field">
                <label>Guest name</label>
                <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
              </div>
              <div className="field">
                <label>Host name</label>
                <input type="text" value={hostName} onChange={(e) => setHostName(e.target.value)} required />
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label>
                  Episode number
                  <span className="sub">{lastEpisode ? `Last guest kit was Ep-${lastEpisode}, so this is the next one.` : "Next number after the last guest kit."}</span>
                </label>
                <input type="text" value={episodeNumber} onChange={(e) => setEpisodeNumber(e.target.value)} required />
              </div>
              <div className="field">
                <label>Guest title <span className="sub">Shown under the quote card. Leave blank and the AI suggests one.</span></label>
                <input type="text" value={guestTitle} onChange={(e) => setGuestTitle(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Guest photo <span className="sub">From the intake form. Upload a file to use a different one.</span></label>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {headshotUrl && !headshot && (
                  <img src={headshotUrl} alt="Guest headshot" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: "50%", border: "1px solid var(--line)" }} />
                )}
                <input type="file" accept="image/*" onChange={(e) => setHeadshot(e.target.files?.[0] || null)} />
              </div>
              {!headshotUrl && !headshot && <p className="hint">No photo on file: the quote card is made without one.</p>}
            </div>
            <div className="row2">
              <div className="field">
                <label>Guest LinkedIn</label>
                <input type="text" value={guestLinkedin} onChange={(e) => setGuestLinkedin(e.target.value)} />
              </div>
              <div className="field">
                <label>Other guest links <span className="sub">One per line</span></label>
                <textarea value={guestOtherLinks} onChange={(e) => setGuestOtherLinks(e.target.value)} style={{ minHeight: 60 }} />
              </div>
            </div>
          </div>

          <div className="section">
            <h2 style={{ marginTop: 0 }}>2. Transcript &amp; chapters</h2>
            <p className="hint" style={{ marginTop: 0 }}>
              From Riverside: Projects → the episode → Edit → copy the transcript and the chapters. Or ask Claude in Cowork:
              &quot;pull Ep {episodeNumber || "NN"} from Riverside into Podforge&quot;.
            </p>
            <div className="field">
              <label>
                Chapters
                <span className="sub">
                  One per line, e.g. &quot;03:08 Understanding the System&quot;.
                  {chapterLines > 0 && ` Read ${chapters.length} of ${chapterLines} lines.`}
                </span>
              </label>
              <textarea value={chaptersText} onChange={(e) => setChaptersText(e.target.value)} style={{ minHeight: 120 }}
                placeholder={"00:00 Introduction\n03:08 Understanding the System"} />
            </div>
            <div className="field">
              <label>Transcript <span className="sub">&quot;Profit Streams®&quot; and other safe fixes are applied automatically.</span></label>
              <textarea value={transcript} onChange={(e) => { setTranscript(e.target.value); setFlags(null); }} style={{ minHeight: 280 }} required />
            </div>
            <button type="button" onClick={checkNames} disabled={checking || !transcript.trim()} style={grey}>
              {checking ? "Checking…" : <IconLabel icon={Search}>Check names</IconLabel>}
            </button>
            {checkMsg && <span style={{ marginLeft: 10, fontSize: 13 }}>{checkMsg}</span>}
            {flags && flags.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>Possible misspellings ({flags.length}):</p>
                {flags.map((f) => (
                  <div key={`${f.found}>${f.suggested}`} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
                    <span style={{ flex: 1 }}><s>{f.found}</s> → <strong>{f.suggested}</strong></span>
                    <button type="button" onClick={() => applyFix(f)} style={{ padding: "4px 10px", fontSize: 12.5 }}>Fix</button>
                    <button type="button" onClick={() => setFlags((fl) => (fl || []).filter((x) => x !== f))} style={{ ...grey, padding: "4px 10px", fontSize: 12.5 }}>Ignore</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="submit-row">
            <button type="submit" disabled={generating}>
              {generating ? "Drafting everything (about 30 to 60 seconds)…" : "Draft episode + guest kit →"}
            </button>
          </div>
          <p className="hint" style={{ textAlign: "center" }}>Free AI limit: one draft every 2 minutes.</p>
        </form>
        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
