"use client";

import { useEffect, useState } from "react";

interface Session {
  guest_name: string | null;
  host_name: string;
  scheduled_at: string;
  status: string;
}

export default function SessionPage({ params }: { params: { token: string } }) {
  const [session, setSession] = useState<Session | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [note, setNote] = useState("");
  const [rescheduleSent, setRescheduleSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${params.token}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((body) => setSession(body.session))
      .catch(() => setNotFound(true));
  }, [params.token]);

  async function submitReschedule() {
    setSubmitting(true);
    try {
      await fetch(`/api/sessions/${params.token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      setRescheduleSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <>
        <div className="success">
          <h1>We couldn&apos;t find that link.</h1>
          <p>
            It may have expired or been mistyped. Please reach out to
            tpandey@appliedframeworks.com and we&apos;ll get you a new one.
          </p>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <div className="success">
          <p>Loading…</p>
        </div>
      </>
    );
  }

  const formattedDate = new Date(session.scheduled_at).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
        <p className="kicker">PROFIT STREAMS® PODCAST</p>
        <h1>You&apos;re scheduled to record!</h1>
        <p>
          {session.guest_name ? `Hi ${session.guest_name.split(" ")[0]}, ` : ""}
          here are the details for your upcoming recording.
        </p>
        </div>
      </header>

      <div className="wrap">
      <div className="section">
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--ink-soft)" }}>
            Recording with
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 600, color: "var(--af-navy)" }}>
            {session.host_name}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--ink-soft)" }}>
            Date & time
          </p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{formattedDate}</p>
        </div>

        {session.status === "reschedule_requested" && !rescheduleSent && (
          <p style={{ marginTop: 16, color: "#B98B2E" }}>
            We&apos;ve already received your reschedule request — someone will follow up
            with a new time shortly.
          </p>
        )}
      </div>

      {!showReschedule && !rescheduleSent && (
        <div className="submit-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
          <a href={`/?token=${params.token}`}>
            <button type="button" style={{ width: "100%" }}>
              This time works — fill out my guest info
            </button>
          </a>
          <button
            type="button"
            onClick={() => setShowReschedule(true)}
            style={{
              background: "none",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              width: "100%",
            }}
          >
            I need a different time
          </button>
        </div>
      )}

      {showReschedule && !rescheduleSent && (
        <div className="section">
          <div className="field">
            <label htmlFor="note">
              Let us know what works better
              <span className="sub">optional — a day/time range is helpful</span>
            </label>
            <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button type="button" onClick={submitReschedule} disabled={submitting}>
            {submitting ? "Sending…" : "Send Request"}
          </button>
        </div>
      )}

      {rescheduleSent && (
        <div className="success" style={{ padding: "40px 0" }}>
          <p>Got it — we&apos;ll follow up with a new time shortly.</p>
        </div>
      )}

      <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
