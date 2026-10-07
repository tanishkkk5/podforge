"use client";

import { useEffect, useState } from "react";
import { HOSTS as SCHEDULER_HOSTS, hostByKey } from "@/lib/hosts";

const HOSTS = ["Luke Hohmann", "Jason Tanner", "Tanisk Pandey", "Other"];

interface Book {
  title?: string;
  onAmazon?: string;
  amazonLink?: string;
  onAudible?: string;
}

interface Submission {
  id: string;
  full_name: string;
  email: string;
  company: string;
  created_at: string;
  role?: string | null;
  short_bio?: string | null;
  long_bio?: string | null;
  headshot_url?: string | null;
  site_biz?: string | null;
  site_personal?: string | null;
  linkedin?: string | null;
  other_links?: string | null;
  books?: Book[] | null;
  resources?: string | null;
  topics?: string | null;
  promo?: string | null;
  host?: string | null;
  booked_at?: string | null;
  share_commitment?: boolean | null;
}

// Guests type these values, so only real web addresses become clickable links.
function isWebUrl(v: string) {
  return /^https?:\/\/[^\s]+$/i.test(v.trim());
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function Answer({ label, value }: { label: string; value?: string | null }) {
  const v = (value || "").trim();
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </p>
      {v ? (
        isWebUrl(v) ? (
          <a href={v} target="_blank" rel="noreferrer noopener" style={{ fontSize: 14, wordBreak: "break-all" }}>{v}</a>
        ) : (
          <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap" }}>{v}</p>
        )
      ) : (
        <p style={{ margin: 0, fontSize: 14, color: "#9AA4AF" }}>— left blank —</p>
      )}
    </div>
  );
}

function responseAsText(s: Submission) {
  const books = (s.books || [])
    .filter((b) => b.title)
    .map((b) => `- ${b.title}${b.amazonLink ? ` (${b.amazonLink})` : ""}`)
    .join("\n");
  return [
    `Name: ${s.full_name}`, `Email: ${s.email}`, `Title / role: ${s.role || ""}`, `Company: ${s.company || ""}`,
    `Short bio: ${s.short_bio || ""}`, `Long bio: ${s.long_bio || ""}`, `Headshot: ${s.headshot_url || ""}`,
    `Business site: ${s.site_biz || ""}`, `Personal site: ${s.site_personal || ""}`, `LinkedIn: ${s.linkedin || ""}`,
    `Other links: ${s.other_links || ""}`, `Books:\n${books || "(none)"}`, `Resources: ${s.resources || ""}`,
    `Topics: ${s.topics || ""}`, `Promotion plans: ${s.promo || ""}`, `Will share within 24h of launch: ${s.share_commitment ? "yes" : "not ticked"}`,
  ].join("\n");
}

function FullResponse({ s }: { s: Submission }) {
  const [copied, setCopied] = useState(false);
  const books = (s.books || []).filter((b) => (b.title || "").trim());
  return (
    <div style={{ background: "#F7F9FB", borderRadius: 8, padding: 16, margin: "4px 0 14px" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 12 }}>
        {s.headshot_url && isWebUrl(s.headshot_url) && (
          <a href={s.headshot_url} target="_blank" rel="noreferrer noopener">
            <img src={s.headshot_url} alt={`${s.full_name} headshot`}
              style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />
          </a>
        )}
        <div style={{ flex: 1 }}>
          <Answer label="Title / role" value={s.role} />
          <Answer label="Company" value={s.company} />
        </div>
      </div>
      <Answer label="Short bio" value={s.short_bio} />
      <Answer label="Long bio" value={s.long_bio} />
      <Answer label="LinkedIn" value={s.linkedin} />
      <Answer label="Business website" value={s.site_biz} />
      <Answer label="Personal website" value={s.site_personal} />
      <Answer label="Other links" value={s.other_links} />

      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.4 }}>
          Books
        </p>
        {books.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "#9AA4AF" }}>— none —</p>
        ) : (
          books.map((b, i) => (
            <div key={i} style={{ fontSize: 14, marginBottom: 6 }}>
              <strong>{b.title}</strong>
              <span style={{ color: "var(--ink-soft)" }}>
                {b.onAmazon ? ` · On Amazon: ${b.onAmazon}` : ""}{b.onAudible ? ` · On Audible: ${b.onAudible}` : ""}
              </span>
              {b.amazonLink && (
                <div>
                  {isWebUrl(b.amazonLink)
                    ? <a href={b.amazonLink} target="_blank" rel="noreferrer noopener" style={{ wordBreak: "break-all" }}>{b.amazonLink}</a>
                    : <span>{b.amazonLink}</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Answer label="Resources they want linked" value={s.resources} />
      <Answer label="Topics they'd like to cover" value={s.topics} />
      <Answer label="How they plan to promote the episode" value={s.promo} />
      <Answer label="Will share within 24 hours of launch?" value={s.share_commitment ? "✅ Yes — they ticked the launch-day box" : "Not ticked (optional)"} />

      <button type="button"
        onClick={() => { navigator.clipboard.writeText(responseAsText(s)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        style={{ background: "#F0F3F6", color: "var(--af-navy)", fontSize: 13, padding: "6px 14px" }}>
        {copied ? "Copied!" : "Copy full response"}
      </button>
    </div>
  );
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState<string | null>(null); // submission id being scheduled
  const [hostName, setHostName] = useState(HOSTS[0]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [links, setLinks] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [linkHost, setLinkHost] = useState(SCHEDULER_HOSTS[0].key);
  const [linkCopied, setLinkCopied] = useState(false);
  const intakeLink = typeof window !== "undefined" ? `${window.location.origin}/?host=${linkHost}` : "";

  // Load automatically when the page opens (the button still refreshes).
  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSubmissions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/submissions`);
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
          <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid var(--line)" }}>
            <p style={{ fontWeight: 700, margin: "0 0 4px" }}>Guest intake link</p>
            <p className="hint" style={{ margin: "0 0 10px" }}>
              Send this to a guest. After the form, they book their recording on the host&apos;s calendar.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select value={linkHost} onChange={(e) => setLinkHost(e.target.value)} style={{ width: "auto" }} aria-label="Host">
                {SCHEDULER_HOSTS.map((h) => <option key={h.key} value={h.key}>{h.name}</option>)}
              </select>
              <input type="text" readOnly value={intakeLink} style={{ flex: 1, minWidth: 240, fontSize: 13 }} />
              <button type="button" onClick={() => { navigator.clipboard.writeText(intakeLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1500); }}>
                {linkCopied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>
          <button type="button" onClick={loadSubmissions} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
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
                  <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--ink-soft)" }}>
                    Submitted {formatDate(s.created_at)}
                  </p>
                  {s.host && (
                    <p style={{ margin: "0 0 10px", fontSize: 13 }}>
                      {s.booked_at ? (
                        <span style={{ background: "#ECFDF3", color: "#0E8A50", fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>
                          📅 Booked a time with {hostByKey(s.host).name} on {formatDate(s.booked_at)} — check {hostByKey(s.host).firstName}&apos;s calendar for the slot
                        </span>
                      ) : (
                        <span style={{ background: "#FFF4E5", color: "#B54708", fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>
                          Not booked yet with {hostByKey(s.host).name} — follow up if it stays this way
                        </span>
                      )}
                    </p>
                  )}

                  <button type="button" onClick={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
                    style={{ background: "#F0F3F6", color: "var(--af-navy)", fontSize: 13, padding: "6px 14px", marginBottom: 12 }}>
                    {open[s.id] ? "Hide full response ▲" : "View full response ▼"}
                  </button>
                  {open[s.id] && <FullResponse s={s} />}

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
