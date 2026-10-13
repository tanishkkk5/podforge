"use client";

import { useState } from "react";
import { TIMEZONES, DEFAULT_TZ, zonedLocalToUtcISO, formatInZone, longInZone } from "@/lib/timezone";

const HOSTS = ["Luke Hohmann", "Jason Tanner", "Tanisk Pandey", "Other"];

export default function AdminPage() {
  const [createdBy, setCreatedBy] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [hostName, setHostName] = useState(HOSTS[0]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [tz, setTz] = useState<string>(DEFAULT_TZ);
  const [riverside, setRiverside] = useState("");
  const [savedISO, setSavedISO] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setLink(null);

    try {
      // Convert "the time I typed, in the time zone I picked" into an exact moment
      const iso = zonedLocalToUtcISO(scheduledAt, tz);
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          createdBy,
          guestName,
          guestEmail,
          hostName,
          scheduledAt: iso,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setLink(body.link);
      setSavedISO(iso);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
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

          <div className="row2">
            <div className="field">
              <label>Recording date &amp; time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                style={{ width: "100%", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 15.5 }}
              />
            </div>
            <div className="field">
              <label>…in this time zone</label>
              <select value={tz} onChange={(e) => setTz(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 15.5 }}>
                {TIMEZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </div>
          </div>
          {scheduledAt && (() => {
            try {
              const iso = zonedLocalToUtcISO(scheduledAt, tz);
              return (
                <p style={{ margin: "-6px 0 14px", fontSize: 14, background: "#F0F7FF", padding: "8px 12px", borderRadius: 6 }}>
                  ✅ That&apos;s <strong>{formatInZone(iso, "America/Los_Angeles")}</strong> · {formatInZone(iso, "America/New_York")} ·{" "}
                  <strong>{formatInZone(iso, "Asia/Kolkata")}</strong>
                </p>
              );
            } catch { return null; }
          })()}

          <div className="field">
            <label>Riverside studio link (optional, goes into the email to the guest)</label>
            <input type="url" value={riverside} onChange={(e) => setRiverside(e.target.value)} placeholder="https://riverside.com/studio/…" />
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
          <h2>✅ Session created — send this to the guest</h2>
          {savedISO && (
            <p style={{ fontSize: 14, marginTop: 0 }}>
              Recording: <strong>{formatInZone(savedISO, tz)}</strong> ({formatInZone(savedISO, "Asia/Kolkata")}). The guest sees it in their own time zone.
            </p>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="text" readOnly value={link} onFocus={(e) => e.target.select()}
              style={{ flex: 1, minWidth: 260, fontFamily: "monospace", fontSize: 13.5 }} />
            <button type="button" onClick={() => { navigator.clipboard.writeText(link); setCopied("link"); setTimeout(() => setCopied(null), 1500); }}>
              {copied === "link" ? "Copied!" : "Copy link"}
            </button>
            <a href={link} target="_blank" rel="noreferrer"><button type="button" style={{ background: "#F0F3F6", color: "var(--af-navy)" }}>Open ↗</button></a>
          </div>
          {(() => {
            const first = (guestName || "").trim().split(/\s+/)[0] || "there";
            const when = savedISO ? longInZone(savedISO, tz) : "";
            const email = [
              `Hi ${first},`,
              ``,
              `Looking forward to your conversation with ${hostName} on ${when}.`,
              ``,
              `To help us prepare your show notes and promotion, could you fill in this short form (about 5 minutes) with your bio, headshot and links?`,
              link,
              ``,
              riverside.trim() ? `We'll record on Riverside: ${riverside.trim()}` : `We'll record on Riverside — the studio link is in the calendar invite.`,
              `A quiet room, headphones and a stable connection work best.`,
              ``,
              `Thanks!`,
              createdBy.trim() || "Tanisk",
            ].join("\n");
            return (
              <>
                <p style={{ fontWeight: 700, margin: "18px 0 6px" }}>Email to the guest (copy, paste, send)</p>
                <textarea readOnly value={email} style={{ minHeight: 230, fontSize: 13.5 }} />
                <button type="button" style={{ marginTop: 8 }}
                  onClick={() => { navigator.clipboard.writeText(email); setCopied("email"); setTimeout(() => setCopied(null), 1500); }}>
                  {copied === "email" ? "Copied!" : "Copy email"}
                </button>
              </>
            );
          })()}
        </div>
      )}

      <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
