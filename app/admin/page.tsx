"use client";

import { useState } from "react";
import Header from "../components/Header";

const HOSTS = ["Luke Hohmann", "Jason Tanner", "Tanisk Pandey", "Other"];

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [hostName, setHostName] = useState(HOSTS[0]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setLink(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          createdBy,
          guestName,
          guestEmail,
          hostName,
          scheduledAt,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setLink(body.link);
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
        <h1>Schedule a Guest</h1>
        <p>
          Create a recording session and get a unique link to send the guest.
          They&apos;ll see the date, who they&apos;re recording with, and can fill out
          their intake form from there.
        </p>
        </div>
      </header>

      <div className="wrap">
      <form onSubmit={handleSubmit} style={{ paddingBottom: 100 }}>
        {error && <div className="error-banner">{error}</div>}

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

          <div className="field">
            <label>Your name (who's scheduling this)</label>
            <input
              type="text"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              placeholder="e.g. Laura, Kevin, Tanisk"
            />
          </div>

          <div className="row2">
            <div className="field">
              <label>Guest name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Guest email</label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Who's hosting?</label>
            <select
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                fontSize: 15.5,
              }}
            >
              {HOSTS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Proposed recording date & time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                fontSize: 15.5,
              }}
            />
          </div>
        </div>

        <div className="submit-row">
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Session Link"}
          </button>
        </div>
      </form>

      {link && (
        <div className="section" style={{ borderTop: "2px solid var(--af-teal)" }}>
          <h2>Send this link to the guest</h2>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: 16,
              wordBreak: "break-all",
              fontFamily: "monospace",
              fontSize: 14,
            }}
          >
            {link}
          </div>
        </div>
      )}

      <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
