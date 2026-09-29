"use client";

import { useState } from "react";

interface Match {
  episode_name: string;
  source_type: string;
  content: string;
  similarity: number;
}

export default function AskArchivePage() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/transcripts/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setMatches(body.matches);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  function copyAllForClaude() {
    if (!matches) return;
    const text =
      `Here are the most relevant past transcript excerpts for the question "${query}":\n\n` +
      matches
        .map((m, i) => `[${i + 1}] From "${m.episode_name}" (${m.source_type}):\n${m.content}`)
        .join("\n\n---\n\n") +
      "\n\nPlease synthesize a clear answer from these excerpts.";
    navigator.clipboard.writeText(text);
    alert("Copied — paste this into your chat with Claude to get a synthesized answer.");
  }

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>Ask the Archive</h1>
          <p>
            Search across every past transcript and Magic Clip. This finds
            the most relevant real quotes — for a synthesized answer, copy
            the results and paste them into a chat with Claude (free).
          </p>
        </div>
      </header>

      <div className="wrap">
        <div className="section">
          {error && <div className="error-banner">{error}</div>}
          <div className="field">
            <label htmlFor="query">Your question</label>
            <input
              type="text"
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. What have guests said about pricing and AI?"
            />
          </div>
          <button type="button" onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? "Searching…" : "Search Archive"}
          </button>
        </div>

        {matches !== null && (
          <div className="section">
            <h2>Most relevant excerpts</h2>
            {matches.length === 0 ? (
              <p className="hint">No matches found — try rephrasing the question.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={copyAllForClaude}
                  style={{ marginBottom: 20, background: "var(--af-navy)" }}
                >
                  Copy All for Claude
                </button>
                {matches.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "16px",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      marginBottom: 12,
                    }}
                  >
                    <p style={{ fontSize: 13, color: "var(--af-teal)", fontWeight: 600, margin: "0 0 8px" }}>
                      {m.episode_name} — {m.source_type} ({(m.similarity * 100).toFixed(0)}% match)
                    </p>
                    <p style={{ fontSize: 14.5, margin: 0 }}>{m.content}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
