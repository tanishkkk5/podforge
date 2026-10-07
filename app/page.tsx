"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import HostScheduler from "@/app/components/HostScheduler";
import { hostByKey } from "@/lib/hosts";

interface BookEntry {
  title: string;
  onAmazon: string;
  amazonLink: string;
  onAudible: string;
}

function emptyBook(): BookEntry {
  return { title: "", onAmazon: "", amazonLink: "", onAudible: "" };
}

export default function IntakePage() {
  return (
    <Suspense fallback={<div className="wrap" />}>
      <IntakeForm />
    </Suspense>
  );
}

function IntakeForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  // Which host's calendar to show after submitting (?host=luke). Defaults to Luke.
  const host = hostByKey(searchParams.get("host"));
  const [guest, setGuest] = useState<{ fullName: string; email: string; id: string | null }>({ fullName: "", email: "", id: null });

  const [sessionInfo, setSessionInfo] = useState<{ host_name: string; scheduled_at: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  // Logged-in team members get extra info; guests never see it.
  const [isTeam, setIsTeam] = useState(false);
  useEffect(() => {
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setIsTeam(!!b.admin))
      .catch(() => setIsTeam(false));
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [books, setBooks] = useState<BookEntry[]>([emptyBook()]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/sessions/${token}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.session) setSessionInfo(body.session);
      })
      .catch(() => {});
  }, [token]);

  function updateBook(index: number, field: keyof BookEntry, value: string) {
    setBooks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addBook() {
    setBooks((prev) => [...prev, emptyBook()]);
  }

  function removeBook(index: number) {
    setBooks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append(
      "books",
      JSON.stringify(books.filter((b) => b.title.trim().length > 0))
    );
    if (token) formData.append("token", token);
    else formData.append("host", host.key);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Something went wrong.");
      }

      setGuest({
        fullName: String(formData.get("fullName") || ""),
        email: String(formData.get("email") || ""),
        id: body.id || null,
      });
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
      <>
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
          <h1>{token ? "You're all set." : "Thanks — your details are in."}</h1>
          <p>
            {token
              ? "Thanks for sending that over — we'll be in touch with recording details, and we'll take it from here on building your episode kit."
              : "We'll take it from here on building your episode kit."}
          </p>
        </div>
        {!token && (
          <HostScheduler host={host} fullName={guest.fullName} email={guest.email} intakeId={guest.id} isTeam={isTeam} />
        )}
        {isTeam && (
          <div className="wrap" style={{ padding: "0 24px" }}>
            <div className="section" style={{ borderLeft: "4px solid #F59E0B", background: "#FFFBF2" }}>
              <h2 style={{ marginTop: 0 }}>Team view — where this submission went</h2>
              <p className="hint" style={{ marginTop: 0 }}>Only you see this box because you&apos;re logged in. Guests just see the message above.</p>
              <ul style={{ fontSize: 14, lineHeight: 1.8, paddingLeft: 18 }}>
                <li><a href="/admin/submissions"><strong>New Submissions</strong> in Podforge →</a> (schedule it from there)</li>
                <li>The <strong>Podforge Guest List</strong> Google Sheet, &quot;Guest List&quot; tab</li>
                <li>A notification email to tpandey@appliedframeworks.com</li>
                <li>Supabase → Table Editor → <code>guest_intakes</code></li>
              </ul>
              <p style={{ fontSize: 13.5, margin: "8px 0 0" }}>
                Was this a test? Delete it from the Google Sheet and from Supabase so it doesn&apos;t look like a real guest.
              </p>
              <p style={{ margin: "12px 0 0" }}><a href="/admin">← Back to the Podforge dashboard</a></p>
            </div>
          </div>
        )}
        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </>
    );
  }

  return (
    <>
      {isTeam && (
        <div style={{ background: "#FFF4E5", borderBottom: "1px solid #F5C77E", padding: "10px 24px", fontSize: 14, textAlign: "center" }}>
          <strong>Team view.</strong> This is the guest intake form exactly as guests see it.{" "}
          <a href="/admin">← Back to dashboard</a> · <a href="/admin/submissions">New Submissions</a>
        </div>
      )}
      <header className="hero">
        <div className="hero-inner">
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
        {sessionInfo && (
          <p
            style={{
              marginTop: 20,
              padding: "12px 16px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid var(--af-teal)",
              borderRadius: 6,
              fontSize: 14.5,
              display: "inline-block",
              color: "#fff",
            }}
          >
            Recording with <strong>{sessionInfo.host_name}</strong> on{" "}
            <strong>
              {new Date(sessionInfo.scheduled_at).toLocaleString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </strong>
          </p>
        )}
        </div>
      </header>

      <div className="wrap">
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
            <input type="text" id="headshotLink" name="headshotLink" placeholder="https://" />
          </div>
        </div>

        <div className="section">
          <h2>Where to find you</h2>
          <p className="hint">Anywhere you&apos;d like listeners pointed.</p>

          <div className="row2">
            <div className="field">
              <label htmlFor="siteBiz">Website (business)</label>
              <input type="text" id="siteBiz" name="siteBiz" placeholder="e.g. pricingfromthestart.com" />
            </div>
            <div className="field">
              <label htmlFor="sitePersonal">Website (personal)</label>
              <input type="text" id="sitePersonal" name="sitePersonal" placeholder="e.g. yourname.com" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="linkedin">LinkedIn</label>
            <input type="text" id="linkedin" name="linkedin" placeholder="e.g. linkedin.com/in/yourname" />
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
          <p className="hint">
            Add as many as apply — click &quot;Add another book&quot; for each one.
          </p>

          {books.map((book, i) => (
            <div className="book-entry" key={i}>
              {books.length > 1 && (
                <div className="book-entry-header">
                  <span>Book {i + 1}</span>
                  <button
                    type="button"
                    className="remove-book"
                    onClick={() => removeBook(i)}
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="field">
                <label>Title</label>
                <input
                  type="text"
                  value={book.title}
                  onChange={(e) => updateBook(i, "title", e.target.value)}
                />
              </div>

              <div className="field">
                <label>Is it available on Amazon?</label>
                <div className="radio-group">
                  {["Yes", "No", "Not sure"].map((opt) => (
                    <label className="radio-pill" key={opt}>
                      <input
                        type="radio"
                        name={`onAmazon-${i}`}
                        checked={book.onAmazon === opt}
                        onChange={() => updateBook(i, "onAmazon", opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {book.onAmazon === "Yes" && (
                  <div className="conditional show">
                    <div className="field" style={{ marginTop: 14 }}>
                      <label>
                        Amazon link
                        <span className="sub">if you have it handy</span>
                      </label>
                      <input
                        type="text"
                        value={book.amazonLink}
                        onChange={(e) => updateBook(i, "amazonLink", e.target.value)}
                        placeholder="https://amazon.com/..."
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="field">
                <label>Is it available on Audible?</label>
                <div className="radio-group">
                  {["Yes", "No", "Not sure"].map((opt) => (
                    <label className="radio-pill" key={opt}>
                      <input
                        type="radio"
                        name={`onAudible-${i}`}
                        checked={book.onAudible === opt}
                        onChange={() => updateBook(i, "onAudible", opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button type="button" className="add-book-btn" onClick={addBook}>
            + Add another book
          </button>
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

        <div className="section">
          <h2>What happens after we record</h2>
          <ul style={{ fontSize: 15, lineHeight: 1.7, paddingLeft: 20, margin: "0 0 14px" }}>
            <li>Episodes go live on <strong>Saturdays at 7:30 AM ET</strong> on Apple Podcasts and Spotify.</li>
            <li>The day before, you&apos;ll get your <strong>episode kit</strong>: quote cards, clips and ready-to-post captions — copy, tweak, post.</li>
            <li><strong>The first 24 hours after launch matter most.</strong> A post from you on launch weekend is the single biggest boost for your episode&apos;s reach.</li>
          </ul>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 400, fontSize: 15 }}>
            <input type="checkbox" name="shareCommitment" value="yes" style={{ width: "auto", marginTop: 4 }} />
            <span>Count me in — I&apos;ll share the episode within 24 hours of launch. <span className="sub">(Optional, and no pressure — it just helps us plan.)</span></span>
          </label>
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
    </>
  );
}
