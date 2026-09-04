"use client";

import { useState } from "react";

export default function IntakePage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onAmazon, setOnAmazon] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong.");
      }

      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      setError(
        err.message ||
          "Something went wrong sending your details — please try again, or email tpandey@appliedframeworks.com directly."
      );
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="wrap">
        <div className="success">
          <div className="check">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1>You&apos;re all set.</h1>
          <p>
            Thanks for sending that over — we&apos;ll be in touch with recording
            details, and we&apos;ll take it from here on building your episode kit.
          </p>
        </div>
        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header className="hero">
        <p className="kicker">PROFIT STREAMS® PODCAST</p>
        <h1>Let&apos;s get your episode kit ready.</h1>
        <p>
          A few details before we record — this lets us build your show notes,
          promotional clips, and links before the episode goes live, instead
          of chasing them down after.
        </p>
        <p className="meta">
          Takes about 5 minutes. Every field is fine to leave blank if it
          doesn&apos;t apply.
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        {error && <div className="error-banner">{error}</div>}

        <div className="section">
          <h2>Who you are</h2>
          <p className="hint">The basics, for show notes and credits.</p>

          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input type="text" id="fullName" name="fullName" required />
          </div>

          <div className="row2">
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div className="field">
              <label htmlFor="role">Current title / role</label>
              <input type="text" id="role" name="role" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="company">Company / organization</label>
            <input type="text" id="company" name="company" />
          </div>
        </div>

        <div className="section">
          <h2>Your bio</h2>
          <p className="hint">
            Paste an existing bio if you have one — no need to write from scratch.
          </p>

          <div className="field">
            <label htmlFor="shortBio">
              Short bio
              <span className="sub">
                2–3 sentences, used in episode descriptions and social captions
              </span>
            </label>
            <textarea id="shortBio" name="shortBio" />
          </div>

          <div className="field">
            <label htmlFor="longBio">
              Standard bio
              <span className="sub">The fuller version, used in show notes</span>
            </label>
            <textarea id="longBio" name="longBio" style={{ minHeight: 130 }} />
          </div>

          <div className="field">
            <label htmlFor="headshotFile">Headshot</label>
            <div className="file-drop">
              Attach a high-resolution headshot, or paste a link to one below.
              <br />
              <input type="file" id="headshotFile" name="headshotFile" accept="image/*" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="headshotLink">
              Or a link to your headshot
              <span className="sub">optional, if you&apos;d rather not upload</span>
            </label>
            <input type="url" id="headshotLink" name="headshotLink" placeholder="https://" />
          </div>
        </div>

        <div className="section">
          <h2>Where to find you</h2>
          <p className="hint">Anywhere you&apos;d like listeners pointed.</p>

          <div className="row2">
            <div className="field">
              <label htmlFor="siteBiz">Website (business)</label>
              <input type="url" id="siteBiz" name="siteBiz" placeholder="https://" />
            </div>
            <div className="field">
              <label htmlFor="sitePersonal">Website (personal)</label>
              <input type="url" id="sitePersonal" name="sitePersonal" placeholder="https://" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="linkedin">LinkedIn</label>
            <input type="url" id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/..." />
          </div>

          <div className="field">
            <label htmlFor="otherLinks">
              Other links
              <span className="sub">Substack, X, YouTube, anywhere else</span>
            </label>
            <textarea id="otherLinks" name="otherLinks" />
          </div>
        </div>

        <div className="section">
          <h2>Book or published work</h2>
          <p className="hint">If this doesn&apos;t apply to you, skip ahead.</p>

          <div className="field">
            <label htmlFor="bookTitle">Title</label>
            <input type="text" id="bookTitle" name="bookTitle" />
          </div>

          <div className="field">
            <label>Is it available on Amazon?</label>
            <div className="radio-group">
              {["Yes", "No", "Not sure"].map((opt) => (
                <label className="radio-pill" key={opt}>
                  <input
                    type="radio"
                    name="onAmazon"
                    value={opt}
                    onChange={() => setOnAmazon(opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            <div className={`conditional ${onAmazon === "Yes" ? "show" : ""}`}>
              <div className="field" style={{ marginTop: 14 }}>
                <label htmlFor="amazonLink">
                  Amazon link
                  <span className="sub">if you have it handy</span>
                </label>
                <input type="url" id="amazonLink" name="amazonLink" placeholder="https://amazon.com/..." />
              </div>
            </div>
          </div>

          <div className="field">
            <label>Is it available on Audible?</label>
            <div className="radio-group">
              {["Yes", "No", "Not sure"].map((opt) => (
                <label className="radio-pill" key={opt}>
                  <input type="radio" name="onAudible" value={opt} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="section">
          <h2>Anything else</h2>
          <p className="hint">Optional, but it helps us prep.</p>

          <div className="field">
            <label htmlFor="resources">
              Resources to mention
              <span className="sub">
                tools, frameworks, articles you&apos;d like linked in the show notes
              </span>
            </label>
            <textarea id="resources" name="resources" />
          </div>

          <div className="field">
            <label htmlFor="topics">Topics to cover — or avoid</label>
            <textarea id="topics" name="topics" />
          </div>

          <div className="field">
            <label htmlFor="promo">
              Promotional plans on your end
              <span className="sub">
                your own newsletter send, a launch date, anything to coordinate around
              </span>
            </label>
            <textarea id="promo" name="promo" />
          </div>
        </div>

        <div className="submit-row">
          <button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send my details"}
          </button>
          <span className="submit-note">We&apos;ll follow up if we need anything else.</span>
        </div>
      </form>

      <footer>Applied Frameworks · Profit Streams® Podcast</footer>
    </div>
  );
}
