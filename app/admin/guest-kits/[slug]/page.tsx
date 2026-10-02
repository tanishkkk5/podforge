"use client";

import { useEffect, useMemo, useState } from "react";
import { buildShowNotes, KitExtras, Resource } from "@/lib/showNotes";
import { FRAMEWORKS } from "@/lib/frameworks";

const RESOURCE_TYPES = ["framework", "book", "person", "company", "tool", "other"];

const EXTRA_FIELDS: { key: keyof KitExtras; label: string; hint?: string; multiline?: boolean }[] = [
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

  useEffect(() => {
    fetch(`/api/guestkit/${params.slug}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load this kit.");
        setKit(body.kit);
        setResources((body.kit.resources || []).map((r: Resource) => ({ ...r, url: r.url || "" })));
        setExtras(body.kit.extras || {});
      })
      .catch((err) => setError(err.message));
  }, [params.slug]);

  const notes = useMemo(
    () => (kit ? buildShowNotes({ ...kit, resources, extras }) : { text: "", missing: [] }),
    [kit, resources, extras]
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

  function downloadNotes() {
    const blob = new Blob([notes.text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Show Notes (Lenny Format) - EP-${kit.episode_number} ${kit.guest_name}.txt`;
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
              {copied ? "Copied!" : "Copy Show Notes"}
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
