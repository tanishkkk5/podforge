"use client";

import { useEffect, useRef, useState } from "react";
import { Host, isSchedulerOrigin, schedulerUrl } from "@/lib/hosts";

const EMBED_SCRIPT = "https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js";

/**
 * Embeds the host's HubSpot booking calendar (decision 0012), pre-filled with
 * the guest's name and email. When HubSpot reports a successful booking, the
 * submission is marked as booked in Podforge.
 */
export default function HostScheduler({
  host,
  fullName,
  email,
  intakeId,
  isTeam,
}: {
  host: Host;
  fullName: string;
  email: string;
  intakeId: string | null;
  isTeam: boolean;
}) {
  const [booked, setBooked] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const embedSrc = schedulerUrl(host, { fullName, email }, true);
  const directLink = schedulerUrl(host, { fullName, email }, false);

  // Load HubSpot's embed script once; it turns the container into the calendar.
  useEffect(() => {
    if (!document.querySelector(`script[src="${EMBED_SCRIPT}"]`)) {
      const s = document.createElement("script");
      s.src = EMBED_SCRIPT;
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  // Listen for HubSpot's "meeting booked" signal.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!isSchedulerOrigin(e.origin, host)) return;
      if (e.data && e.data.meetingBookSucceeded) {
        setBooked(true);
        if (intakeId) {
          fetch("/api/submit/booked", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: intakeId }),
          }).catch(() => {});
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [host, intakeId]);

  return (
    <div className="wrap" style={{ padding: "0 24px" }}>
      <div className="section">
        {booked ? (
          <>
            <h2 style={{ marginTop: 0 }}>🎉 You&apos;re booked with {host.firstName}!</h2>
            <p style={{ fontSize: 15 }}>
              A calendar invite is on its way to your email. Looking forward to the conversation.
            </p>
          </>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>One last step: pick your recording time with {host.firstName}</h2>
            <p className="hint" style={{ marginTop: 0 }}>
              Choose any open slot below — your name and email are already filled in.
            </p>
            {isTeam && (
              <p style={{ fontSize: 13, background: "#FFF4E5", padding: "8px 12px", borderRadius: 6 }}>
                <strong>Team view:</strong> booking a slot here creates a <em>real</em> meeting on {host.firstName}&apos;s calendar. Don&apos;t book while testing.
              </p>
            )}
            <div ref={container} className="meetings-iframe-container" data-src={embedSrc} style={{ minHeight: 640 }} />
            <p style={{ fontSize: 13.5, marginTop: 10 }}>
              Calendar not loading?{" "}
              <a href={directLink} target="_blank" rel="noreferrer noopener">Open {host.firstName}&apos;s calendar in a new tab ↗</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
