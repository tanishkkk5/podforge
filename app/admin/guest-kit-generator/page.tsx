"use client";

import { useState } from "react";

export default function GuestKitGeneratorPage() {
  const [transcript, setTranscript] = useState("");
  const [guestName, setGuestName] = useState("");
  const [hostName, setHostName] = useState("Luke Hohmann");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [chaptersText, setChaptersText] = useState(""); // one per line: "00:00 Intro"
  const [headshot, setHeadshot] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  function parseChapters() {
    return chaptersText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.*)$/);
        return match ? { time: match[1], title: match[2] } : null;
      })
      .filter(Boolean);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("transcript", transcript);
      fd.append("guestName", guestName);
      fd.append("hostName", hostName);
      fd.append("episodeNumber", episodeNumber);
      fd.append("chapters", JSON.stringify(parseChapters()));
      if (headshot) fd.append("headshot", headshot);

      const res = await fetch("/api/guestkit/generate", {
        method: "POST",
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setResult(body);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>Guest Kit Generator</h1>
          <p>
            Paste a transcript, and this builds the full guest kit automatically —
            title, summary, 10 key takeaways, a quote card, and a thumbnail —
            all in your brand, ready to review before sending to the guest.
          </p>
        </div>
      </header>

      <div className="wrap">
        <form onSubmit={handleGenerate} style={{ paddingBottom: 100 }}>
          {error && <div className="error-banner">{error}</div>}

          <div className="section">
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

            <div className="field">
              <label>Episode number</label>
              <input type="text" value={episodeNumber} onChange={(e) => setEpisodeNumber(e.target.value)} placeholder="e.g. 51" required />
            </div>

            <div className="field">
              <label>
                Chapters
                <span className="sub">Optional — one per line, e.g. "03:08 Understanding the System"</span>
              </label>
              <textarea
                value={chaptersText}
                onChange={(e) => setChaptersText(e.target.value)}
                style={{ minHeight: 140 }}
                placeholder={"00:00 Introduction\n03:08 Understanding the System"}
              />
            </div>

            <div className="field">
              <label>
                Guest headshot
                <span className="sub">Optional — appears on the thumbnail and quote card</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setHeadshot(e.target.files?.[0] || null)}
              />
            </div>

            <div className="field">
              <label>Transcript</label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                style={{ minHeight: 300 }}
                required
              />
            </div>
          </div>

          <div className="submit-row">
            <button type="submit" disabled={generating}>
              {generating ? "Generating (this can take ~30-60s)…" : "Generate Guest Kit"}
            </button>
          </div>
        </form>

        {result && (
          <div className="section" style={{ borderTop: "2px solid var(--af-teal)" }}>
            <h2>Guest kit ready</h2>
            <p style={{ marginBottom: 16 }}>
              <a href={result.url} target="_blank" rel="noreferrer">{result.url}</a>
            </p>
            {result.content.truncated && (
              <div className="error-banner" style={{ marginBottom: 16 }}>
                Heads up: this transcript was long enough to hit Groq&apos;s free-tier
                token limit, so only the first portion was analyzed. The title,
                summary, takeaways, and resources below are based on a partial
                transcript, not the full conversation — worth a manual read-through
                before publishing.
              </div>
            )}
            <p className="hint">
              <strong>Title:</strong> {result.content.title}<br />
              <strong>Hook:</strong> {result.content.hook}
            </p>

            {result.content.resources && result.content.resources.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontWeight: 700, marginBottom: 6 }}>
                  Resources found — add the real link for each, then copy into the show notes:
                </p>
                {result.content.resources.map((r: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", gap: 10, alignItems: "center",
                      padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 14
                    }}
                  >
                    <span style={{ minWidth: 70, fontSize: 11, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 700 }}>
                      {r.type}
                    </span>
                    <span style={{ flex: 1 }}>{r.label}</span>
                    <input
                      type="text"
                      placeholder="paste real link here"
                      style={{ flex: 1, fontSize: 13, padding: "6px 10px" }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
