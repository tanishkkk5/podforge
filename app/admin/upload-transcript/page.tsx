"use client";

import { useState } from "react";
import Header from "../../components/Header";

export default function UploadTranscriptPage() {
  const [password, setPassword] = useState("");
  const [episodeName, setEpisodeName] = useState("");
  const [sourceType, setSourceType] = useState("main_transcript");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/transcripts/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, episodeName, sourceType, content }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setResult(`Stored ${body.chunksStored} chunks for "${episodeName}".`);
      setContent("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>Add to the Transcript Archive</h1>
          <p>
            Paste a transcript (main episode or a Magic Clip) to make it
            searchable across the whole archive. Free to run — no cost per
            upload.
          </p>
        </div>
      </header>

      <div className="wrap">
        <form onSubmit={handleSubmit} style={{ paddingBottom: 100 }}>
          {error && <div className="error-banner">{error}</div>}
          {result && (
            <div
              style={{
                background: "#EAF7F1",
                border: "1px solid var(--af-teal)",
                borderRadius: 6,
                padding: "12px 16px",
                marginBottom: 24,
                fontSize: 14,
                color: "#0E6B5A",
              }}
            >
              {result}
            </div>
          )}

          <div className="section">
            <div className="field">
              <label>Admin password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="row2">
              <div className="field">
                <label>Episode / guest name</label>
                <input
                  type="text"
                  value={episodeName}
                  onChange={(e) => setEpisodeName(e.target.value)}
                  placeholder="e.g. Garrick van Buren"
                  required
                />
              </div>
              <div className="field">
                <label>Source type</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    fontSize: 15.5,
                  }}
                >
                  <option value="main_transcript">Main Transcript</option>
                  <option value="magic_clip">Magic Clip</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Transcript content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ minHeight: 300 }}
                required
              />
            </div>
          </div>

          <div className="submit-row">
            <button type="submit" disabled={submitting}>
              {submitting ? "Embedding & storing…" : "Add to Archive"}
            </button>
          </div>
        </form>

        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
