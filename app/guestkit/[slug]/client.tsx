"use client";

import { useState } from "react";
import {
  captionBody, captionFooter, Captions, CaptionKit, fullCaption, hashtagsOf, Platform, PostKey, POSTS, postImages, postsWithImages,
} from "@/lib/guestCaptions";

interface Kit extends CaptionKit {
  slug: string;
  episode_number: string;
  guest_title: string;
  image_urls: any;
  extras?: any;
}

// Supabase Storage forces a real file download (instead of opening the image) with "download=<filename>".
function downloadUrl(url: string, filename: string) {
  return `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(filename)}`;
}

const btnGrey = { background: "#F0F3F6", color: "var(--af-navy)" } as const;
const small = { padding: "6px 12px", fontSize: 12.5 } as const;

function PostCard({
  n, kit, postKey, editable, onSaveBody,
}: {
  n: number; kit: Kit; postKey: PostKey; editable: boolean;
  onSaveBody: (key: PostKey, p: Platform, text: string | null) => Promise<void>;
}) {
  const post = POSTS.find((p) => p.key === postKey)!;
  const images = postImages(kit.image_urls, postKey);
  const multi = images.length > 1;
  const ep = `EP-${kit.episode_number}`;
  const [platform, setPlatform] = useState<Platform>("li");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const text = fullCaption(kit, postKey, platform);
  const isEdited = !!kit.captions?.[postKey]?.[platform]?.trim();

  async function refresh() {
    setBusy("Writing a new caption…"); setMsg(null);
    try {
      const res = await fetch(`/api/guestkit/${kit.slug}/refresh`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ what: "caption", post: postKey, platform }),
      });
      const b = await res.json();
      if (!res.ok) throw new Error(b.error || "Refresh failed.");
      setDraft(b.caption);
      setEditing(true);
      setMsg("New caption below. Edit it if you like, then Save.");
    } catch (e: any) { setMsg(`❌ ${e.message}`); } finally { setBusy(null); }
  }

  async function save(value: string | null) {
    setBusy("Saving…"); setMsg(null);
    try { await onSaveBody(postKey, platform, value); setEditing(false); setMsg("✅ Saved"); }
    catch (e: any) { setMsg(`❌ ${e.message}`); } finally { setBusy(null); }
  }

  const title = `${n}. ${post.label}${postKey === "takeaways" ? ` (${images.length} slides, post them together, in order)` : ""}`;
  return (
    <div className="section">
      <h2>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: multi ? "repeat(auto-fill, minmax(150px, 1fr))" : "1fr", gap: 12, marginBottom: 16 }}>
        {images.map((url, i) => {
          const name = `${ep} ${post.file}${multi ? ` ${String(i + 1).padStart(2, "0")}` : ""}.png`;
          return (
            <div key={url} style={{ textAlign: "center" }}>
              <img src={url} alt={multi ? `${post.label}, slide ${i + 1}` : post.label}
                style={{ width: "100%", maxWidth: multi ? 220 : 340, display: "block", margin: "0 auto 8px", borderRadius: 8, border: "1px solid var(--line)" }} />
              <a href={downloadUrl(url, name)}>
                <button type="button" style={multi ? small : undefined}>{multi ? `Download ${i + 1}` : "Download image"}</button>
              </a>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {(["li", "ig"] as Platform[]).map((p) => (
          <button key={p} type="button" onClick={() => { setPlatform(p); setEditing(false); setMsg(null); }}
            style={{ background: platform === p ? "var(--af-navy)" : "#F0F3F6", color: platform === p ? "#fff" : "var(--ink-soft)", padding: "6px 14px", fontSize: 13 }}>
            {p === "li" ? "LinkedIn" : "Instagram"}
          </button>
        ))}
      </div>

      {editing ? (
        <div style={{ border: "1px solid var(--af-teal)", borderRadius: 8, padding: 12, background: "#F5FBFF" }}>
          <label style={{ fontSize: 13, fontWeight: 700 }}>Caption text (editable)</label>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} style={{ minHeight: 120, fontSize: 13.5, marginTop: 6 }} />
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", whiteSpace: "pre-wrap", margin: "8px 0" }}>
            Always added after it (can&apos;t be removed):{"\n"}{captionFooter(kit, platform)}{"\n"}{hashtagsOf(kit)}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={small} disabled={!!busy || !draft.trim()} onClick={() => save(draft)}>Save caption</button>
            <button type="button" style={{ ...btnGrey, ...small }} disabled={!!busy} onClick={refresh}>✨ Refresh again</button>
            <button type="button" style={{ ...btnGrey, ...small }} disabled={!!busy} onClick={() => { setEditing(false); setMsg(null); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "14px 16px", marginBottom: 10, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", background: "#FAFCFE" }}>
          {text}
          <br />
          <button type="button" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
            style={{ background: copied ? "#0E8A50" : "var(--af-navy)", marginTop: 10, ...small }}>
            {copied ? "Copied!" : "Copy caption"}
          </button>
        </div>
      )}

      {editable && !editing && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6, padding: "8px 10px", background: "#FFF8EC", borderRadius: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#B54708" }}>TEAM ONLY</span>
          <button type="button" style={{ ...btnGrey, ...small }} disabled={!!busy}
            onClick={() => { setDraft(captionBody(kit, postKey, platform)); setEditing(true); setMsg(null); }}>✏️ Edit</button>
          <button type="button" style={{ ...btnGrey, ...small }} disabled={!!busy} onClick={refresh}>✨ Refresh</button>
          {isEdited && <button type="button" style={{ ...btnGrey, ...small }} disabled={!!busy} onClick={() => save(null)}>Reset to default</button>}
        </div>
      )}
      {(busy || msg) && <p style={{ fontSize: 13, margin: "6px 0 0" }}>{busy || msg}</p>}
    </div>
  );
}

export default function GuestKitClient({ kit: initial, editable = false }: { kit: Kit; editable?: boolean }) {
  const [kit, setKit] = useState<Kit>(initial);
  const [tags, setTags] = useState(initial.hashtags || "");
  const [tagMsg, setTagMsg] = useState<string | null>(null);
  const keys = postsWithImages(kit.image_urls);
  const x = kit.extras || {};

  async function patch(body: any) {
    const res = await fetch(`/api/guestkit/${kit.slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const b = await res.json();
    if (!res.ok) throw new Error(b.error || "Save failed.");
    setKit((k) => ({ ...k, ...b.kit }));
  }

  async function saveBody(key: PostKey, p: Platform, text: string | null) {
    const caps: Captions = JSON.parse(JSON.stringify(kit.captions || {}));
    caps[key] = { ...(caps[key] || {}) };
    if (text === null) delete caps[key]![p];
    else caps[key]![p] = text;
    await patch({ captions: caps });
  }

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">EP-{kit.episode_number} · PROFIT STREAMS® PODCAST</p>
          <h1>Your Guest Kit</h1>
          <p>
            Thanks for joining, {kit.guest_name.split(" ")[0]}! Everything below is ready to download and post. Edit any caption
            so it sounds like you.
          </p>
          <p style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.12)", borderRadius: 8 }}>
            🚀 <strong>Launch weekend:</strong> your episode goes live on <strong>Saturday at 7:30 AM ET</strong>. Posting within the
            first 24 hours is the single biggest boost for its reach. On LinkedIn, tag Luke Hohmann by typing @ and picking his name.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <a href={`/api/kitdownload/${kit.slug}`}><button type="button" style={{ background: "#fff", color: "var(--af-navy)" }}>⬇️ Download all (images + captions)</button></a>
            {x.guestBundleUrl && <a href={x.guestBundleUrl} target="_blank" rel="noreferrer"><button type="button" style={{ background: "#fff", color: "var(--af-navy)" }}>📁 Drive folder (audio, clips, transcript)</button></a>}
            {x.lukePostUrl && <a href={x.lukePostUrl} target="_blank" rel="noreferrer"><button type="button" style={{ background: "#fff", color: "var(--af-navy)" }}>👍 Like and reshare Luke&apos;s post</button></a>}
          </div>
        </div>
      </header>

      <div className="wrap">
        {editable && (
          <div className="section" style={{ background: "#FFF8EC", border: "1px solid #F5C77E" }}>
            <h2 style={{ marginTop: 0 }}>Team only: hashtags for every caption</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" value={tags} placeholder={hashtagsOf({ ...kit, hashtags: "" })} onChange={(e) => setTags(e.target.value)} />
              <button type="button" onClick={async () => { setTagMsg(null); try { await patch({ hashtags: tags }); setTagMsg("✅ Saved"); } catch (e: any) { setTagMsg(`❌ ${e.message}`); } }}>Save</button>
            </div>
            {tagMsg && <p style={{ fontSize: 13, margin: "6px 0 0" }}>{tagMsg}</p>}
            <p className="hint" style={{ marginBottom: 0 }}>
              Links in every caption come from the Episode Studio (Spotify, Apple, episode page). Guests never see these team controls.
            </p>
          </div>
        )}
        {keys.map((k, i) => (
          <PostCard key={k} n={i + 1} kit={kit} postKey={k} editable={editable} onSaveBody={saveBody} />
        ))}
        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
