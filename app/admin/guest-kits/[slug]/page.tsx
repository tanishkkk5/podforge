"use client";

import { useEffect, useMemo, useState } from "react";
import { buildShowNotes, KitExtras, Resource, ShowNotesVariant } from "@/lib/showNotes";
import { FRAMEWORKS } from "@/lib/frameworks";
import { TOPICS } from "@/lib/topics";

const RESOURCE_TYPES = ["framework", "book", "person", "company", "tool", "other"];

// Review standard checklist (knowledge/standards/review-standard.md)
const REVIEW_CHECKS = [
  "I read the title, hook, takeaways and quote",
  "Names are spelled right and it says Profit Streams®",
  "Nothing is made up — every fact is from the episode",
  "The images and captions on the guest page look right",
];

const EXTRA_FIELDS: { key: keyof KitExtras; label: string; hint?: string; multiline?: boolean }[] = [
  { key: "episodePageUrl", label: "Episode page on profit-streams.com", hint: "Guests' posts link here, and the Spotify/Apple show notes send book clicks here — it's AF's registered Amazon Associates site." },
  { key: "guestLinkedin", label: "Guest LinkedIn URL" },
  { key: "guestOtherLinks", label: "Other guest links", hint: 'One per line, e.g. "Website: https://..."', multiline: true },
  { key: "hostLinkedin", label: "Host LinkedIn URL", hint: "Leave blank for Luke, Laura or Kevin — filled in automatically." },
  { key: "spotifyUrl", label: "Spotify episode link" },
  { key: "appleUrl", label: "Apple Podcasts episode link" },
  { key: "relatedEpisode", label: "Related episode", hint: 'e.g. "Ep-48: Title with Garrick van Buren — https://..."' },
];

export default function GuestKitEditorPage({ params }: { params: { slug: string } }) {
  const [kit, setKit] = useState<any>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [extras, setExtras] = useState<KitExtras>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [variant, setVariant] = useState<ShowNotesVariant>("website");
  const [reviewer, setReviewer] = useState("Tanisk Pandey");
  const [checks, setChecks] = useState<boolean[]>(REVIEW_CHECKS.map(() => false));
  const [reviewing, setReviewing] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [takeawayTopics, setTakeawayTopics] = useState<(string | null)[]>([]);
  const [topicMsg, setTopicMsg] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    fetch(`/api/guestkit/${params.slug}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load this kit.");
        setKit(body.kit);
        setResources((body.kit.resources || []).map((r: Resource) => ({ ...r, url: r.url || "" })));
        setExtras(body.kit.extras || {});
        setTopics(body.kit.topics || []);
        setTakeawayTopics(
          (body.kit.takeaways || []).map((_: string, i: number) => (body.kit.takeaway_topics || [])[i] || null)
        );
      })
      .catch((err) => setError(err.message));
  }, [params.slug]);

  const notes = useMemo(
    () => (kit ? buildShowNotes({ ...kit, resources, extras }, variant) : { text: "", missing: [] }),
    [kit, resources, extras, variant]
  );

  function updateResource(i: number, patch: Partial<Resource>) {
    setResources((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setSavedAt(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/guestkit/${params.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resources, extras }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed.");
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function setReview(review: "approve" | "unapprove") {
    setReviewing(true);
    setError(null);
    try {
      const res = await fetch(`/api/guestkit/${params.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review, reviewer }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not update the review.");
      setKit(body.kit);
      if (review === "unapprove") setChecks(REVIEW_CHECKS.map(() => false));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReviewing(false);
    }
  }

  async function suggestTopics() {
    setSuggesting(true);
    setTopicMsg(null);
    try {
      const res = await fetch(`/api/guestkit/${params.slug}/tag`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not suggest topics.");
      setTopics(body.topics);
      setTopicMsg("AI suggestion added — check it, then click Save topics.");
    } catch (err: any) {
      setTopicMsg(`❌ ${err.message}`);
    } finally {
      setSuggesting(false);
    }
  }

  async function saveTopics() {
    setTopicMsg(null);
    const res = await fetch(`/api/guestkit/${params.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics, takeaway_topics: takeawayTopics }),
    });
    const body = await res.json();
    setTopicMsg(res.ok ? "✅ Topics saved." : `❌ ${body.error || "Save failed."}`);
  }

  function downloadNotes() {
    const blob = new Blob([notes.text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Show Notes (${variant === "website" ? "Website" : "Spotify-Apple"}) - EP-${kit.episode_number} ${kit.guest_name}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (error && !kit) {
    return (
      <div className="wrap" style={{ padding: 40 }}>
        <div className="error-banner">{error}</div>
        <a href="/admin/guest-kits">← Back to all kits</a>
      </div>
    );
  }
  if (!kit) return <div className="wrap" style={{ padding: 40 }}><p className="hint">Loading…</p></div>;

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">EP-{kit.episode_number} · {kit.guest_name.toUpperCase()}</p>
          <h1>{kit.title}</h1>
          <p>
            Add the real links, save, then copy the Show Notes.{" "}
            <a href={`/guestkit/${kit.slug}`} target="_blank" rel="noreferrer">Open the guest&apos;s page ↗</a>
          </p>
        </div>
      </header>

      <div className="wrap" style={{ padding: "8px 24px 100px" }}>
        {error && <div className="error-banner">{error}</div>}

        <div className="section" style={{ borderLeft: `4px solid ${kit.status === "approved" ? "#0E8A50" : "#F59E0B"}` }}>
          <h2 style={{ marginTop: 0 }}>
            Review &amp; approve{" "}
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, verticalAlign: "middle",
              background: kit.status === "approved" ? "#ECFDF3" : "#FFF4E5", color: kit.status === "approved" ? "#0E8A50" : "#B54708",
            }}>
              {kit.status === "approved" ? "APPROVED" : "DRAFT"}
            </span>
          </h2>
          {kit.status === "approved" ? (
            <>
              <p style={{ fontSize: 14 }}>
                ✅ Approved by <strong>{kit.reviewed_by}</strong>
                {kit.reviewed_at ? ` on ${new Date(kit.reviewed_at).toLocaleString()}` : ""}. The guest&apos;s link is live — you can send it.
              </p>
              <button type="button" onClick={() => setReview("unapprove")} disabled={reviewing}
                style={{ background: "#F0F3F6", color: "var(--af-navy)" }}>
                Move back to draft (hides it from the guest)
              </button>
            </>
          ) : (
            <>
              <p className="hint" style={{ marginTop: 0 }}>
                The guest&apos;s link shows &quot;being prepared&quot; until this kit is approved. AI drafted it —
                a person checks it before the guest sees it.{" "}
                <a href={`/guestkit/${kit.slug}`} target="_blank" rel="noreferrer">Preview the guest page ↗</a>
              </p>
              {REVIEW_CHECKS.map((c, i) => (
                <label key={c} style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400, fontSize: 14, margin: "6px 0" }}>
                  <input type="checkbox" checked={checks[i]} style={{ width: "auto" }}
                    onChange={() => setChecks((cs) => cs.map((v, j) => (j === i ? !v : v)))} />
                  {c}
                </label>
              ))}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                <input type="text" value={reviewer} onChange={(e) => setReviewer(e.target.value)}
                  placeholder="Your name" style={{ maxWidth: 220 }} aria-label="Reviewer name" />
                <button type="button" onClick={() => setReview("approve")}
                  disabled={reviewing || !checks.every(Boolean) || !reviewer.trim()}>
                  {reviewing ? "Saving…" : "Approve — make the guest link live"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="section">
          <h2>Topics</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            The same 10 topics as the Content Library. Used to filter kits and match takeaways to creators.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 10 }}>
            {topics.length === 0 && <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>No topics yet.</span>}
            {topics.map((t) => (
              <span key={t} style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999,
                fontSize: 12, fontWeight: 600, background: "#E6F4FC", color: "var(--af-navy)", border: "1px solid #BFE3F7",
              }}>
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => setTopics(topics.filter((x) => x !== t))}
                  style={{ background: "none", color: "var(--af-navy)", padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
              </span>
            ))}
            {topics.length < 3 && (
              <select value="" onChange={(e) => e.target.value && setTopics([...topics, e.target.value])}
                style={{ width: "auto", fontSize: 12, padding: "3px 6px" }}>
                <option value="">+ topic</option>
                {TOPICS.filter((t) => !topics.includes(t)).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <button type="button" onClick={suggestTopics} disabled={suggesting}
              style={{ background: "#F0F3F6", color: "var(--af-navy)", fontSize: 12.5, padding: "5px 12px" }}>
              {suggesting ? "Thinking…" : "✨ Suggest topics"}
            </button>
          </div>

          <details style={{ marginBottom: 12 }}>
            <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Topic for each takeaway</summary>
            {(kit.takeaways || []).map((t: string, i: number) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ flex: 1, fontSize: 13.5 }}>{i + 1}. {t}</span>
                <select value={takeawayTopics[i] || ""} style={{ width: 210, fontSize: 12 }}
                  onChange={(e) => setTakeawayTopics((tt) => tt.map((v, j) => (j === i ? e.target.value || null : v)))}>
                  <option value="">— none —</option>
                  {TOPICS.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>
            ))}
          </details>

          <button type="button" onClick={saveTopics}>Save topics</button>
          {topicMsg && <span style={{ marginLeft: 12, fontSize: 13 }}>{topicMsg}</span>}
        </div>

        <div className="section">
          <h2>Resource links</h2>
          <p className="hint">
            Found in the transcript by the AI. Paste the real link for each one — never guess.
            Amazon links get the affiliate tag automatically. Anything left blank stays out of the notes.
          </p>
          {resources.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <select
                value={r.type}
                onChange={(e) => updateResource(i, { type: e.target.value })}
                style={{ width: 110, fontSize: 13 }}
              >
                {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                type="text"
                value={r.label}
                onChange={(e) => updateResource(i, { label: e.target.value })}
                style={{ flex: 1, fontSize: 13 }}
              />
              <input
                type="text"
                value={r.url || ""}
                placeholder="paste real link here"
                onChange={(e) => updateResource(i, { url: e.target.value })}
                style={{ flex: 1, fontSize: 13 }}
              />
              <button
                type="button"
                onClick={() => { setResources((rs) => rs.filter((_, idx) => idx !== i)); setSavedAt(null); }}
                style={{ background: "#F0F3F6", color: "var(--ink-soft)", padding: "6px 10px", fontSize: 12 }}
                aria-label={`Remove ${r.label}`}
              >
                ✕
              </button>
            </div>
          ))}
          <p className="hint" style={{ marginTop: 14, marginBottom: 6 }}>
            Did the guest mention one of our frameworks? Add its appliedframeworks.com page in one click:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {FRAMEWORKS.filter((f) => !resources.some((r) => r.url === f.url)).map((f) => (
              <button
                key={f.url}
                type="button"
                onClick={() => {
                  setResources((rs) => [{ label: `Learn more about ${f.name}`, type: "framework", url: f.url }, ...rs]);
                  setSavedAt(null);
                }}
                style={{ background: "#E6F4FC", color: "var(--af-navy)", fontSize: 12, padding: "4px 10px" }}
              >
                + {f.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setResources((rs) => [...rs, { label: "", type: "other", url: "" }])}
            style={{ background: "#F0F3F6", color: "var(--af-navy)", fontSize: 13, padding: "6px 14px" }}
          >
            + Add resource
          </button>
        </div>

        <div className="section">
          <h2>Show Notes details</h2>
          {EXTRA_FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              {f.hint && <p className="sub">{f.hint}</p>}
              {f.multiline ? (
                <textarea
                  value={extras[f.key] || ""}
                  onChange={(e) => { setExtras({ ...extras, [f.key]: e.target.value }); setSavedAt(null); }}
                />
              ) : (
                <input
                  type="text"
                  value={extras[f.key] || ""}
                  onChange={(e) => { setExtras({ ...extras, [f.key]: e.target.value }); setSavedAt(null); }}
                />
              )}
            </div>
          ))}
          <button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {savedAt && <span style={{ marginLeft: 12, fontSize: 13, color: "#0E8A50" }}>Saved at {savedAt}</span>}
        </div>

        <div className="section">
          <h2>Show Notes (Lenny Format)</h2>
          <div style={{ display: "flex", gap: 8, margin: "0 0 10px" }}>
            {([["website", "Website (profit-streams.com)"], ["platforms", "Spotify / Apple"]] as [ShowNotesVariant, string][]).map(([v, label]) => (
              <button key={v} type="button" onClick={() => setVariant(v)}
                style={{ padding: "6px 14px", fontSize: 13, background: variant === v ? "var(--af-navy)" : "#F0F3F6", color: variant === v ? "#fff" : "var(--af-navy)" }}>
                {label}
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 0 }}>
            {variant === "website"
              ? "For the episode's page on profit-streams.com — AF's registered Amazon Associates site — with tagged book links and the disclosure."
              : "For Spotify and Apple episode descriptions — they aren't registered with Amazon Associates, so there are NO Amazon links; books point to the episode page."}
          </p>
          {notes.missing.length > 0 ? (
            <div className="error-banner" style={{ textAlign: "left" }}>
              <strong>Still missing ({notes.missing.length}):</strong>
              <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                {notes.missing.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </div>
          ) : (
            <p style={{ color: "#0E8A50", fontWeight: 700, fontSize: 14 }}>✓ Complete — ready to publish.</p>
          )}
          <textarea readOnly value={notes.text} style={{ minHeight: 420, fontSize: 13, lineHeight: 1.55 }} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(notes.text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? "Copied!" : variant === "website" ? "Copy website version" : "Copy Spotify/Apple version"}
            </button>
            <button type="button" onClick={downloadNotes} style={{ background: "#F0F3F6", color: "var(--af-navy)" }}>
              Download .txt
            </button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Review the summary paragraph before publishing — it&apos;s AI-written and may need a personal touch.
          </p>
        </div>

        <p><a href="/admin/guest-kits">← Back to all kits</a></p>
        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
