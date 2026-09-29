"use client";

import { useState } from "react";

const HOSTS = ["Luke Hohmann", "Jason Tanner", "Tanisk Pandey", "Other"];

interface Submission {
  id: string;
  full_name: string;
  email: string;
  company: string;
  created_at: string;
}

export default function SubmissionsPage() {
  const [password, setPassword] = useState("");
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState<string | null>(null); // submission id being scheduled
  const [hostName, setHostName] = useState(HOSTS[0]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [links, setLinks] = useState<Record<string, string>>({});

  async function loadSubmissions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions?password=${encodeURIComponent(password)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setSubmissions(body.submissions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSchedule(submission: Submission) {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          guestName: submission.full_name,
          guestEmail: submission.email,
          hostName,
          scheduledAt,
          intakeId: submission.id,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setLinks((prev) => ({ ...prev, [submission.id]: body.link }));
      setScheduling(null);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>New Submissions</h1>
          <p>
            Guests who filled out the intake form directly, without a
            pre-scheduled session. Schedule a recording time for any of them below.
          </p>
        </div>
      </header>

      <div className="wrap">
        <div className="section">
          {error && <div className="error-banner">{error}</div>}
          <div className="field">
            <label>Admin password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="button" onClick={loadSubmissions} disabled={loading || !password}>
            {loading ? "Loading…" : "Load Submissions"}
          </button>
        </div>

        {submissions !== null && (
          <div className="section">
            {submissions.length === 0 ? (
              <p className="hint">No unscheduled submissions right now.</p>
            ) : (
              submissions.map((s) => (
                <div
                  key={s.id}
                  style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 16, marginBottom: 12 }}
                >
                  <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--af-navy)" }}>{s.full_name}</p>
                  <p style={{ margin: "0 0 4px", fontSize: 14, color: "var(--ink-soft)" }}>
                    {s.email} {s.company ? `· ${s.company}` : ""}
                  </p>
                  <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--ink-soft)" }}>
                    Submitted {new Date(s.created_at).toLocaleDateString()}
                  </p>

                  {links[s.id] ? (
                    <div style={{ fontSize: 13.5, wordBreak: "break-all", color: "var(--af-teal)" }}>
                      {links[s.id]}
                    </div>
                  ) : scheduling === s.id ? (
                    <div>
                      <div className="row2" style={{ marginBottom: 12 }}>
                        <div className="field">
                          <label>Host</label>
                          <select
                            value={hostName}
                            onChange={(e) => setHostName(e.target.value)}
                            style={{ width: "100%", padding: "10px", border: "1px solid var(--line)", borderRadius: 6 }}
                          >
                            {HOSTS.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label>Date & time</label>
                          <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            style={{ width: "100%", padding: "10px", border: "1px solid var(--line)", borderRadius: 6 }}
                          />
                        </div>
                      </div>
                      <button type="button" onClick={() => handleSchedule(s)}>Confirm Schedule</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setScheduling(s.id)}>Schedule Recording</button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
