"use client";

import { useState } from "react";
import Header from "../../components/Header";

interface Flagged {
  found: string;
  suggested: string;
  distance: number;
}
interface Resource {
  label: string;
  url: string;
}

export default function TranscriptCheckPage() {
  const [transcript, setTranscript] = useState("");
  const [flagged, setFlagged] = useState<Flagged[] | null>(null);
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/transcript-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setFlagged(body.flagged);
      setResources(body.suggestedResources);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <Header />
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>Transcript Checker</h1>
          <p>
            Paste a transcript to catch misspelled names automatically, and
            get the standard resource links ready to drop into the Resources
            section — no retyping needed.
          </p>
        </div>
      </header>

      <div className="wrap">
        <div className="section">
          {error && <div className="error-banner">{error}</div>}
          <div className="field">
            <label htmlFor="transcript">Paste transcript</label>
            <textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              style={{ minHeight: 260 }}
              placeholder="Paste the full or partial transcript here..."
            />
          </div>
          <button type="button" onClick={handleCheck} disabled={checking || !transcript.trim()}>
            {checking ? "Checking…" : "Check Transcript"}
          </button>
        </div>

        {flagged !== null && (
          <div className="section">
            <h2>Possible name misspellings</h2>
            {flagged.length === 0 ? (
              <p className="hint">No likely misspellings found — names look clean.</p>
            ) : (
              <div>
                {flagged.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 16px",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      marginBottom: 10,
                      fontSize: 14.5,
                    }}
                  >
                    Found <strong>&quot;{f.found}&quot;</strong> — likely meant{" "}
                    <strong style={{ color: "var(--af-teal)" }}>&quot;{f.suggested}&quot;</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {resources !== null && (
          <div className="section">
            <h2>Standard resources to include</h2>
            <p className="hint">Copy these straight into this episode&apos;s Resources section.</p>
            {resources.map((r, i) => (
              <p key={i} style={{ fontSize: 14.5, marginBottom: 8 }}>
                {r.label}: <a href={r.url}>{r.url}</a>
              </p>
            ))}
          </div>
        )}

        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
