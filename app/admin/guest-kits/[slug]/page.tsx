"use client";

import { useEffect, useMemo, useState } from "react";
import { buildShowNotes, KitExtras, Resource, ShowNotesVariant } from "@/lib/showNotes";
import { FRAMEWORKS } from "@/lib/frameworks";
import { TOPICS } from "@/lib/topics";
import { DEFAULT_HASHTAGS } from "@/lib/guestCaptions";

// Episode Studio, step 2 (decision 0016): title → episode # → description → resources →
// links after publishing → show notes → guest kit → Drive bundle → approve.

const RESOURCE_TYPES = ["framework", "book", "person", "company", "tool", "other"];

// Review standard checklist (knowledge/standards/review-standard.md)
const REVIEW_CHECKS = [
  "I read the title, hook, takeaways and quote",
  "Names are spelled right and it says Profit Streams®",
  "Nothing is made up: every fact is from the episode",
  "The images and captions on the guest page look right",
];

type ExtraField = { key: keyof KitExtras | "lukePostUrl" | "afPostUrl"; label: string; hint?: string; multiline?: boolean };
const LINK_FIELDS: ExtraField[] = [
  { key: "spotifyUrl", label: "Spotify episode link", hint: "Added to every guest caption and the show notes." },
  { key: "appleUrl", label: "Apple Podcasts episode link", hint: "Added to every guest caption and the show notes." },
  { key: "episodePageUrl", label: "Episode page on profit-streams.com", hint: "AF's registered Amazon Associates site. Show notes send book clicks here." },
  { key: "lukePostUrl", label: "Luke's LinkedIn post for this episode", hint: "Shown to the guest as \"Like and reshare Luke's post\"." },
  { key: "afPostUrl", label: "AF company page LinkedIn post", hint: "For your records and the weekly stats." },
];
const PEOPLE_FIELDS: ExtraField[] = [
  { key: "guestLinkedin", label: "Guest LinkedIn URL" },
  { key: "guestOtherLinks", label: "Other guest links", hint: 'One per line, e.g. "Website: https://..."', multiline: true },
  { key: "hostLinkedin", label: "Host LinkedIn URL", hint: "Leave blank for Luke, Laura or Kevin: filled in automatically." },
  { key: "relatedEpisode", label: "Related episode", hint: 'e.g. "Ep-48: Title, with Garrick van Buren: https://..."' },
  { key: "driveFolder", label: "Episode folder in Google Drive", hint: "Leave empty to use the tracked episode's folder or create the standard one." },
];

const grey = { background: "#F0F3F6", color: "var(--af-navy)" } as const;
const small = { padding: "5px 12px", fontSize: 12.5 } as const;

function chaptersToText(ch: { time: string; title: string }[] | null) {
  return (ch || []).map((c) => `${c.time} ${c.title}`).join("\n");
}
function textToChapters(t: string) {
  return t.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const m = line.match(/^\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?\s*[-:.]?\s*(.+)$/);
    return m ? { time: m[1], title: m[2].trim() } : null;
  }).filter(Boolean) as { time: string; title: string }[];
}

function Suggestions({ items, onPick, onClose, label = "Use this" }: { items: string[]; onPick: (s: string) => void; onClose: () => void; label?: string }) {
  return (
    <div style={{ border: "1px dashed var(--af-teal)", borderRadius: 8, padding: 10, margin: "8px 0", background: "#F5FBFF" }}>
      {items.map((t) => (
        <div key={t} style={{ display: "flex", gap: 10, alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
          <span style={{ flex: 1 }}>{t}</span>
          <button type="button" style={small} onClick={() => onPick(t)}>{label}</button>
        </div>
      ))}
      <button type="button" onClick={onClose} style={{ ...grey, ...small, marginTop: 8 }}>Close</button>
    </div>
  );
}

export default function EpisodeStudioEditor({ params }: { params: { slug: string } }) {
  const [kit, setKit] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ isNew: boolean; truncated: boolean }>({ isNew: false, truncated: false });

  // Content (title → description)
  const [title, setTitle] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [hook, setHook] = useState("");
  const [summary, setSummary] = useState("");
  const [guestTitle, setGuestTitle] = useState("");
  const [quote, setQuote] = useState("");
  const [takeaways, setTakeaways] = useState<string[]>([]);
  const [chaptersText, setChaptersText] = useState("");
  const [contentDirty, setContentDirty] = useState(false);
  const [contentBusy, setContentBusy] = useState<string | null>(null);
  const [contentMsg, setContentMsg] = useState<string | null>(null);

  // AI refresh suggestions
  const [titleOpts, setTitleOpts] = useState<string[] | null>(null);
  const [quoteOpts, setQuoteOpts] = useState<string[] | null>(null);
  const [descOpt, setDescOpt] = useState<{ hook: string; summary: string } | null>(null);
  const [takeawayOpt, setTakeawayOpt] = useState<string[] | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [refreshErr, setRefreshErr] = useState<string | null>(null);

  // Resources, links, notes
  const [resources, setResources] = useState<Resource[]>([]);
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [variant, setVariant] = useState<ShowNotesVariant>("platforms");

  // Guest kit settings
  const [hashtags, setHashtags] = useState("");
  const [amazonInGuest, setAmazonInGuest] = useState(true);
  const [kitMsg, setKitMsg] = useState<string | null>(null);

  // Drive bundle
  const [bundleBusy, setBundleBusy] = useState(false);
  const [bundleMsg, setBundleMsg] = useState<string | null>(null);

  // Topics + review
  const [topics, setTopics] = useState<string[]>([]);
  const [takeawayTopics, setTakeawayTopics] = useState<(string | null)[]>([]);
  const [topicMsg, setTopicMsg] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [reviewer, setReviewer] = useState("Tanisk Pandey");
  const [checks, setChecks] = useState<boolean[]>(REVIEW_CHECKS.map(() => false));
  const [reviewing, setReviewing] = useState(false);

  function loadKit(k: any) {
    setKit(k);
    setTitle(k.title || "");
    setEpisodeNumber(String(k.episode_number || ""));
    setHook(k.hook || "");
    setSummary(k.summary || "");
    setGuestTitle(k.guest_title || "");
    setQuote(k.best_quote || "");
    setTakeaways(k.takeaways || []);
    setChaptersText(chaptersToText(k.chapters));
    setResources((k.resources || []).map((r: Resource) => ({ ...r, url: r.url || "" })));
    setExtras(k.extras || {});
    setHashtags(k.hashtags || "");
    setAmazonInGuest(k.amazon_in_guest_posts !== false);
    setTopics(k.topics || []);
    setTakeawayTopics((k.takeaways || []).map((_: string, i: number) => (k.takeaway_topics || [])[i] || null));
    setContentDirty(false);
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setBanner({ isNew: q.get("new") === "1", truncated: q.get("truncated") === "1" });
    fetch(`/api/guestkit/${params.slug}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load this episode.");
        loadKit(body.kit);
      })
      .catch((err) => setError(err.message));
  }, [params.slug]);

  const locked = kit?.status === "approved";
  const chapters = useMemo(() => textToChapters(chaptersText), [chaptersText]);
  const notesKit = useMemo(
    () => (kit ? { ...kit, title, episode_number: episodeNumber, hook, summary, takeaways, chapters, resources, extras } : null),
    [kit, title, episodeNumber, hook, summary, takeaways, chapters, resources, extras]
  );
  const notes = useMemo(() => (notesKit ? buildShowNotes(notesKit, variant) : { text: "", missing: [] }), [notesKit, variant]);

  const edit = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setContentDirty(true); setContentMsg(null); };

  async function patch(body: any) {
    const res = await fetch(`/api/guestkit/${params.slug}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const b = await res.json();
    if (!res.ok) throw new Error(b.error || "Save failed.");
    return b.kit;
  }

  async function saveContent() {
    setContentBusy("Saving…"); setContentMsg(null);
    try {
      await patch({ title, episode_number: episodeNumber, hook, summary, guest_title: guestTitle, best_quote: quote, takeaways, chapters });
      setContentBusy("Rebuilding images with your changes (about 15 seconds)…");
      const res = await fetch(`/api/guestkit/${params.slug}/images`, { method: "POST" });
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Image rebuild failed.");
      loadKit(b.kit);
      setContentMsg(`✅ Saved and images rebuilt at ${new Date().toLocaleTimeString()}.`);
    } catch (e: any) {
      setContentMsg(`❌ ${e.message}`);
    } finally { setContentBusy(null); }
  }

  async function refresh(what: string, extra: Record<string, string> = {}) {
    setRefreshing(what); setRefreshErr(null);
    try {
      const res = await fetch(`/api/guestkit/${params.slug}/refresh`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ what, ...extra }),
      });
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Refresh failed.");
      if (what === "titles") setTitleOpts(b.titles);
      if (what === "quote") setQuoteOpts(b.quotes);
      if (what === "description") setDescOpt({ hook: b.hook, summary: b.summary });
      if (what === "takeaways") setTakeawayOpt(b.takeaways);
    } catch (e: any) {
      setRefreshErr(e.message);
    } finally { setRefreshing(null); }
  }

  function updateResource(i: number, p: Partial<Resource>) {
    setResources((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
    setSavedAt(null);
  }

  async function saveLinks() {
    setSaving(true); setError(null);
    try {
      const k = await patch({ resources, extras });
      setExtras(k.extras || {});
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  async function saveKitSettings() {
    setKitMsg(null);
    try {
      await patch({ hashtags, amazon_in_guest_posts: amazonInGuest });
      setKitMsg("✅ Saved. Every caption on the guest page now uses these.");
    } catch (e: any) { setKitMsg(`❌ ${e.message}`); }
  }

  async function buildBundle() {
    setBundleBusy(true); setBundleMsg("Building the guest's Drive folder (up to a minute)…");
    try {
      await patch({ resources, extras }).catch(() => null); // keep a just-pasted folder link
      const res = await fetch(`/api/guestkit/${params.slug}/bundle`, { method: "POST" });
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Failed.");
      const k = await fetch(`/api/guestkit/${params.slug}`).then((r) => r.json());
      if (k.kit) setExtras(k.kit.extras || {});
      setBundleMsg(
        `✅ ${b.images} images, captions, transcript and START HERE are in.` +
        (b.failed?.length ? ` ${b.failed.length} failed: ${b.failed.join(", ")}.` : "") +
        (b.shared ? " The folder is viewable by anyone with the link." : " ⚠️ Couldn't turn on link sharing: open the folder and share it with the guest yourself.")
      );
    } catch (e: any) {
      setBundleMsg(`❌ ${e.message}`);
    } finally { setBundleBusy(false); }
  }

  async function setReview(review: "approve" | "unapprove") {
    setReviewing(true); setError(null);
    try {
      const k = await patch({ review, reviewer });
      setKit(k);
      if (review === "unapprove") setChecks(REVIEW_CHECKS.map(() => false));
    } catch (e: any) { setError(e.message); } finally { setReviewing(false); }
  }

  async function suggestTopics() {
    setSuggesting(true); setTopicMsg(null);
    try {
      const res = await fetch(`/api/guestkit/${params.slug}/tag`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not suggest topics.");
      setTopics(body.topics);
      setTopicMsg("AI suggestion added: check it, then click Save topics.");
    } catch (e: any) { setTopicMsg(`❌ ${e.message}`); } finally { setSuggesting(false); }
  }

  async function saveTopics() {
    setTopicMsg(null);
    try { await patch({ topics, takeaway_topics: takeawayTopics }); setTopicMsg("✅ Topics saved."); }
    catch (e: any) { setTopicMsg(`❌ ${e.message}`); }
  }

  function downloadNotes() {
    const blob = new Blob([notes.text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Show Notes (${variant === "website" ? "Website" : "Spotify-Apple"}) - EP-${episodeNumber} ${kit.guest_name}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (error && !kit) {
    return (
      <div className="wrap" style={{ padding: 40 }}>
        <div className="error-banner">{error}</div>
        <a href="/admin/guest-kits">← Back to all episodes</a>
      </div>
    );
  }
  if (!kit) return <div className="wrap" style={{ padding: 40 }}><p className="hint">Loading…</p></div>;

  const extraInput = (f: ExtraField) => (
    <div className="field" key={f.key}>
      <label>{f.label}</label>
      {f.hint && <p className="sub">{f.hint}</p>}
      {f.multiline ? (
        <textarea value={extras[f.key] || ""} onChange={(e) => { setExtras({ ...extras, [f.key]: e.target.value }); setSavedAt(null); }} />
      ) : (
        <input type="text" value={extras[f.key] || ""} onChange={(e) => { setExtras({ ...extras, [f.key]: e.target.value }); setSavedAt(null); }} />
      )}
    </div>
  );

  const saveContentBar = (
    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
      <button type="button" onClick={saveContent} disabled={locked || !!contentBusy || !contentDirty}>
        {contentBusy ? "Working…" : "Save + rebuild images"}
      </button>
      {contentBusy && <span style={{ fontSize: 13 }}>{contentBusy}</span>}
      {!contentBusy && contentDirty && <span style={{ fontSize: 13, color: "#B54708" }}>Unsaved changes</span>}
      {contentMsg && <span style={{ fontSize: 13 }}>{contentMsg}</span>}
    </div>
  );

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">EPISODE STUDIO · EP-{kit.episode_number} · {kit.guest_name.toUpperCase()}</p>
          <h1>{kit.title}</h1>
          <p>
            Hosted by {kit.host_name}.{" "}
            <a href={`/guestkit/${kit.slug}`} target="_blank" rel="noreferrer">Preview the guest kit page ↗</a>
          </p>
        </div>
      </header>

      <div className="wrap" style={{ padding: "8px 24px 100px" }}>
        {error && <div className="error-banner">{error}</div>}
        {banner.isNew && <div className="section" style={{ borderLeft: "4px solid var(--af-teal)", fontSize: 14 }}>✅ Draft ready. Start with the title, then work down the page.</div>}
        {banner.truncated && (
          <div className="error-banner">
            This transcript was longer than the free AI limit, so only the first part was read for the first draft. Refresh
            buttons look at the beginning, middle and end; still read the takeaways against the episode.
          </div>
        )}
        {locked && (
          <div className="section" style={{ borderLeft: "4px solid #0E8A50", fontSize: 14 }}>
            🔒 Approved by <strong>{kit.reviewed_by}</strong>, so it&apos;s final and locked. To change anything, move it back to draft at the bottom.
          </div>
        )}
        {refreshErr && <div className="error-banner">{refreshErr}</div>}

        <fieldset disabled={locked} style={{ border: "none", padding: 0, margin: 0 }}>
          {/* 1. TITLE */}
          <div className="section">
            <h2 style={{ marginTop: 0 }}>1. Title</h2>
            <div className="field">
              <label>Episode title <span className="sub">Under 60 characters. Published as &quot;Ep-{episodeNumber} {title || "Title"}, with {kit.guest_name}&quot; ({title.length} chars)</span></label>
              <input type="text" value={title} onChange={(e) => edit(setTitle)(e.target.value)} />
            </div>
            <button type="button" onClick={() => refresh("titles")} disabled={!!refreshing} style={{ ...grey, ...small }}>
              {refreshing === "titles" ? "Thinking…" : "✨ 5 new title ideas"}
            </button>
            {titleOpts && <Suggestions items={titleOpts} onPick={(t) => { edit(setTitle)(t); }} onClose={() => setTitleOpts(null)} />}

            {/* 2. EPISODE NUMBER */}
            <h2>2. Episode number</h2>
            <div className="field" style={{ maxWidth: 200 }}>
              <input type="text" value={episodeNumber} onChange={(e) => edit(setEpisodeNumber)(e.target.value)} />
            </div>
            {saveContentBar}
          </div>

          {/* 3. DESCRIPTION */}
          <div className="section">
            <h2 style={{ marginTop: 0 }}>3. Description</h2>
            <div className="field">
              <label>Hook <span className="sub">One sentence. Also the &quot;Big Idea&quot; image.</span></label>
              <input type="text" value={hook} onChange={(e) => edit(setHook)(e.target.value)} />
            </div>
            <div className="field">
              <label>Summary <span className="sub">2 to 3 sentences for the show notes.</span></label>
              <textarea value={summary} onChange={(e) => edit(setSummary)(e.target.value)} style={{ minHeight: 80 }} />
            </div>
            <button type="button" onClick={() => refresh("description")} disabled={!!refreshing} style={{ ...grey, ...small }}>
              {refreshing === "description" ? "Thinking…" : "✨ Rewrite hook + summary"}
            </button>
            {descOpt && (
              <div style={{ border: "1px dashed var(--af-teal)", borderRadius: 8, padding: 10, margin: "8px 0", background: "#F5FBFF", fontSize: 14 }}>
                <p style={{ margin: "0 0 6px" }}><strong>Hook:</strong> {descOpt.hook}</p>
                <p style={{ margin: "0 0 8px" }}><strong>Summary:</strong> {descOpt.summary}</p>
                <button type="button" style={small} onClick={() => { edit(setHook)(descOpt.hook); edit(setSummary)(descOpt.summary); setDescOpt(null); }}>Use these</button>{" "}
                <button type="button" style={{ ...grey, ...small }} onClick={() => setDescOpt(null)}>Close</button>
              </div>
            )}

            <h3 style={{ marginTop: 22 }}>10 key takeaways</h3>
            {takeaways.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ width: 22, paddingTop: 8, fontWeight: 700, fontSize: 13 }}>{i + 1}.</span>
                <textarea value={t} style={{ minHeight: 44, fontSize: 13.5 }}
                  onChange={(e) => edit(setTakeaways)(takeaways.map((x, j) => (j === i ? e.target.value : x)))} />
              </div>
            ))}
            <button type="button" onClick={() => refresh("takeaways")} disabled={!!refreshing} style={{ ...grey, ...small }}>
              {refreshing === "takeaways" ? "Thinking (about 20 seconds)…" : "✨ New set of 10 takeaways"}
            </button>
            {takeawayOpt && (
              <div style={{ border: "1px dashed var(--af-teal)", borderRadius: 8, padding: 10, margin: "8px 0", background: "#F5FBFF", fontSize: 14 }}>
                <ol style={{ margin: "0 0 8px 18px", padding: 0 }}>{takeawayOpt.map((t) => <li key={t}>{t}</li>)}</ol>
                <button type="button" style={small} onClick={() => { edit(setTakeaways)(takeawayOpt); setTakeawayOpt(null); }}>Use all 10</button>{" "}
                <button type="button" style={{ ...grey, ...small }} onClick={() => setTakeawayOpt(null)}>Close</button>
              </div>
            )}

            <h3 style={{ marginTop: 22 }}>Quote card</h3>
            <div className="field">
              <label>Best quote <span className="sub">Word for word from the guest.</span></label>
              <textarea value={quote} onChange={(e) => edit(setQuote)(e.target.value)} style={{ minHeight: 60 }} />
            </div>
            <div className="field">
              <label>Guest title (under the quote)</label>
              <input type="text" value={guestTitle} onChange={(e) => edit(setGuestTitle)(e.target.value)} />
            </div>
            <button type="button" onClick={() => refresh("quote")} disabled={!!refreshing} style={{ ...grey, ...small }}>
              {refreshing === "quote" ? "Thinking…" : "✨ Other quotes"}
            </button>
            {quoteOpts && <Suggestions items={quoteOpts} onPick={(q) => { edit(setQuote)(q); setQuoteOpts(null); }} onClose={() => setQuoteOpts(null)} />}

            <h3 style={{ marginTop: 22 }}>Chapters</h3>
            <div className="field">
              <label><span className="sub">One per line, &quot;00:00 Title&quot;. {chapters.length} read.</span></label>
              <textarea value={chaptersText} onChange={(e) => edit(setChaptersText)(e.target.value)} style={{ minHeight: 140, fontSize: 13 }} />
            </div>
            {saveContentBar}
          </div>
        </fieldset>

        {/* 4. RESOURCES */}
        <div className="section">
          <h2 style={{ marginTop: 0 }}>4. Resources</h2>
          <p className="hint">Found in the transcript by the AI. Paste the real link for each one, never guess. Amazon links get the affiliate tag automatically. Blank ones stay out of the notes.</p>
          {resources.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <select value={r.type} onChange={(e) => updateResource(i, { type: e.target.value })} style={{ width: 110, fontSize: 13 }}>
                {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="text" value={r.label} onChange={(e) => updateResource(i, { label: e.target.value })} style={{ flex: 1, fontSize: 13 }} />
              <input type="text" value={r.url || ""} placeholder="paste real link here" onChange={(e) => updateResource(i, { url: e.target.value })} style={{ flex: 1, fontSize: 13 }} />
              <button type="button" onClick={() => { setResources((rs) => rs.filter((_, idx) => idx !== i)); setSavedAt(null); }}
                style={{ ...grey, padding: "6px 10px", fontSize: 12 }} aria-label={`Remove ${r.label}`}>✕</button>
            </div>
          ))}
          <p className="hint" style={{ marginTop: 14, marginBottom: 6 }}>Did the guest mention one of our frameworks? Add its page in one click:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {FRAMEWORKS.filter((f) => !resources.some((r) => r.url === f.url)).map((f) => (
              <button key={f.url} type="button"
                onClick={() => { setResources((rs) => [{ label: `Learn more about ${f.name}`, type: "framework", url: f.url }, ...rs]); setSavedAt(null); }}
                style={{ background: "#E6F4FC", color: "var(--af-navy)", fontSize: 12, padding: "4px 10px" }}>+ {f.name}</button>
            ))}
          </div>
          <button type="button" onClick={() => setResources((rs) => [...rs, { label: "", type: "other", url: "" }])} style={{ ...grey, fontSize: 13, padding: "6px 14px" }}>+ Add resource</button>
          {PEOPLE_FIELDS.map(extraInput)}
          <button type="button" onClick={saveLinks} disabled={saving}>{saving ? "Saving…" : "Save resources + links"}</button>
          {savedAt && <span style={{ marginLeft: 12, fontSize: 13, color: "#0E8A50" }}>Saved at {savedAt}</span>}
        </div>

        {/* 5. AFTER PUBLISHING */}
        <div className="section">
          <h2 style={{ marginTop: 0 }}>5. Links after publishing</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Paste these once the episode is live on Spotify and Apple and the LinkedIn posts are up. They flow into the show notes,
            every guest caption, the Download all zip and the Drive bundle. You can keep adding them after approval.
          </p>
          {LINK_FIELDS.map(extraInput)}
          <button type="button" onClick={saveLinks} disabled={saving}>{saving ? "Saving…" : "Save links"}</button>
          {savedAt && <span style={{ marginLeft: 12, fontSize: 13, color: "#0E8A50" }}>Saved at {savedAt}</span>}
        </div>

        {/* 6. SHOW NOTES */}
        <div className="section">
          <h2 style={{ marginTop: 0 }}>6. Show notes</h2>
          <div style={{ display: "flex", gap: 8, margin: "0 0 10px" }}>
            {([["platforms", "Spotify / Apple"], ["website", "Website (profit-streams.com)"]] as [ShowNotesVariant, string][]).map(([v, label]) => (
              <button key={v} type="button" onClick={() => setVariant(v)}
                style={{ padding: "6px 14px", fontSize: 13, background: variant === v ? "var(--af-navy)" : "#F0F3F6", color: variant === v ? "#fff" : "var(--af-navy)" }}>
                {label}
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 0 }}>
            {variant === "website"
              ? "For profit-streams.com, AF's registered Amazon Associates site: tagged book links and the disclosure."
              : "For Spotify and Apple descriptions: no Amazon links, books point to the episode page."}
            {contentDirty && " Shows your unsaved edits too."}
          </p>
          {notes.missing.length > 0 ? (
            <div className="error-banner" style={{ textAlign: "left" }}>
              <strong>Still missing ({notes.missing.length}):</strong>
              <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>{notes.missing.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          ) : (
            <p style={{ color: "#0E8A50", fontWeight: 700, fontSize: 14 }}>✓ Complete, ready to publish.</p>
          )}
          <textarea readOnly value={notes.text} style={{ minHeight: 420, fontSize: 13, lineHeight: 1.55 }} />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button type="button" onClick={() => { navigator.clipboard.writeText(notes.text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
              {copied ? "Copied!" : variant === "website" ? "Copy website version" : "Copy Spotify/Apple version"}
            </button>
            <button type="button" onClick={downloadNotes} style={grey}>Download .txt</button>
          </div>
        </div>

        {/* 7. GUEST KIT */}
        <div className="section">
          <h2 style={{ marginTop: 0 }}>7. Guest kit</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Edit or ✨ refresh each caption right on the{" "}
            <a href={`/guestkit/${kit.slug}`} target="_blank" rel="noreferrer">guest kit preview ↗</a>. Every caption automatically ends with
            the episode links, Luke&apos;s LinkedIn and (if on) the Profit Streams® book link with the #ad line. The thumbnail is
            not part of the kit: send it in the email for now.
          </p>
          <fieldset disabled={locked} style={{ border: "none", padding: 0, margin: 0 }}>
            <div className="field">
              <label>Hashtags on every caption</label>
              <input type="text" value={hashtags} placeholder={DEFAULT_HASHTAGS} onChange={(e) => setHashtags(e.target.value)} />
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400, fontSize: 14, margin: "6px 0 12px" }}>
              <input type="checkbox" checked={amazonInGuest} onChange={(e) => setAmazonInGuest(e.target.checked)} style={{ width: "auto" }} />
              Put the Amazon book link + #ad line in guest captions (decision 0016, pending Luke/Kevin sign-off)
            </label>
            <button type="button" onClick={saveKitSettings}>Save kit settings</button>
          </fieldset>
          {kitMsg && <span style={{ marginLeft: 12, fontSize: 13 }}>{kitMsg}</span>}
          <p style={{ marginTop: 14 }}>
            <a href={`/api/kitdownload/${kit.slug}`}><button type="button" style={grey}>⬇️ Download all (images + LinkedIn + Instagram captions)</button></a>
          </p>
        </div>

        {/* 8. DRIVE BUNDLE */}
        <div className="section">
          <h2 style={{ marginTop: 0 }}>8. Guest Drive folder</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Builds Guest Bundle → 0 START HERE · 1 Posts · 2 Clips · 3 Thumbnail · 4 Audio &amp; Transcript inside the episode folder,
            and fills START HERE, the posts, captions and transcript. Then drop the audio, the 3 clips and the thumbnail into their folders.
            Run it again after edits or new links: files are replaced, not duplicated.
          </p>
          <button type="button" onClick={buildBundle} disabled={bundleBusy}>{bundleBusy ? "Building…" : "📁 Build / update guest Drive folder"}</button>
          {bundleMsg && <p style={{ fontSize: 13.5 }}>{bundleMsg}</p>}
          {extras.guestBundleUrl && (
            <ul style={{ fontSize: 14, lineHeight: 1.8 }}>
              <li><a href={extras.guestBundleUrl} target="_blank" rel="noreferrer">Guest Bundle (share this link with the guest) ↗</a></li>
              {extras.bundleAudioUrl && <li><a href={extras.bundleAudioUrl} target="_blank" rel="noreferrer">4 Audio &amp; Transcript: drop the episode audio here ↗</a></li>}
              {extras.bundleClipsUrl && <li><a href={extras.bundleClipsUrl} target="_blank" rel="noreferrer">2 Clips: drop the 3 Magic Clips here ↗</a></li>}
              {extras.bundleThumbUrl && <li><a href={extras.bundleThumbUrl} target="_blank" rel="noreferrer">3 Thumbnail: drop the Canva thumbnail here ↗</a></li>}
            </ul>
          )}
        </div>

        {/* TOPICS */}
        <div className="section">
          <details>
            <summary style={{ cursor: "pointer", fontSize: 16, fontWeight: 700 }}>Topics (for the Content Library and creator kits)</summary>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", margin: "12px 0" }}>
              {topics.length === 0 && <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>No topics yet.</span>}
              {topics.map((t) => (
                <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#E6F4FC", color: "var(--af-navy)", border: "1px solid #BFE3F7" }}>
                  {t}
                  <button type="button" aria-label={`Remove ${t}`} onClick={() => setTopics(topics.filter((x) => x !== t))} style={{ background: "none", color: "var(--af-navy)", padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
                </span>
              ))}
              {topics.length < 3 && (
                <select value="" onChange={(e) => e.target.value && setTopics([...topics, e.target.value])} style={{ width: "auto", fontSize: 12, padding: "3px 6px" }}>
                  <option value="">+ topic</option>
                  {TOPICS.filter((t) => !topics.includes(t)).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              <button type="button" onClick={suggestTopics} disabled={suggesting} style={{ ...grey, ...small }}>{suggesting ? "Thinking…" : "✨ Suggest topics"}</button>
            </div>
            {(kit.takeaways || []).map((t: string, i: number) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ flex: 1, fontSize: 13.5 }}>{i + 1}. {t}</span>
                <select value={takeawayTopics[i] || ""} style={{ width: 210, fontSize: 12 }}
                  onChange={(e) => setTakeawayTopics((tt) => tt.map((v, j) => (j === i ? e.target.value || null : v)))}>
                  <option value="">none</option>
                  {TOPICS.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>
            ))}
            <button type="button" onClick={saveTopics} style={{ marginTop: 10 }}>Save topics</button>
            {topicMsg && <span style={{ marginLeft: 12, fontSize: 13 }}>{topicMsg}</span>}
          </details>
        </div>

        {/* 9. APPROVE */}
        <div className="section" style={{ borderLeft: `4px solid ${locked ? "#0E8A50" : "#F59E0B"}` }}>
          <h2 style={{ marginTop: 0 }}>
            9. Review &amp; approve{" "}
            <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, verticalAlign: "middle", background: locked ? "#ECFDF3" : "#FFF4E5", color: locked ? "#0E8A50" : "#B54708" }}>
              {locked ? "APPROVED · FINAL" : "DRAFT"}
            </span>
          </h2>
          {locked ? (
            <>
              <p style={{ fontSize: 14 }}>
                ✅ Approved by <strong>{kit.reviewed_by}</strong>{kit.reviewed_at ? ` on ${new Date(kit.reviewed_at).toLocaleString()}` : ""}. The guest&apos;s link is live:{" "}
                <a href={`/guestkit/${kit.slug}`} target="_blank" rel="noreferrer">/guestkit/{kit.slug}</a>
              </p>
              <button type="button" onClick={() => setReview("unapprove")} disabled={reviewing} style={grey}>Move back to draft (hides it from the guest and unlocks editing)</button>
            </>
          ) : (
            <>
              <p className="hint" style={{ marginTop: 0 }}>The guest&apos;s link shows &quot;being prepared&quot; until approved. Once approved, the kit is final and locked.</p>
              {contentDirty && <div className="error-banner">You have unsaved changes above. Save them before approving.</div>}
              {REVIEW_CHECKS.map((c, i) => (
                <label key={c} style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400, fontSize: 14, margin: "6px 0" }}>
                  <input type="checkbox" checked={checks[i]} style={{ width: "auto" }} onChange={() => setChecks((cs) => cs.map((v, j) => (j === i ? !v : v)))} />
                  {c}
                </label>
              ))}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                <input type="text" value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Your name" style={{ maxWidth: 220 }} aria-label="Reviewer name" />
                <button type="button" onClick={() => setReview("approve")} disabled={reviewing || contentDirty || !checks.every(Boolean) || !reviewer.trim()}>
                  {reviewing ? "Saving…" : "Approve: final, make the guest link live"}
                </button>
              </div>
            </>
          )}
        </div>

        <p><a href="/admin/guest-kits">← Back to all episodes</a></p>
        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
