"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TOPICS } from "@/lib/topics";

interface Creator {
  id: string;
  name: string;
  profile_url: string | null;
  platforms: string[];
  topics: string[];
  notes: string | null;
}
interface LibItem {
  id: string;
  kind: "episode" | "clip";
  title: string;
  guest_name: string | null;
  episode_label: string | null;
  video_url: string | null;
  topics: string[];
}
interface KitRow {
  slug: string;
  created_at: string;
  creator_name: string;
  item_count: number;
  status?: string;
  reviewed_by?: string | null;
}

const MAX_ITEMS = 6;
const ghost: React.CSSProperties = { background: "#F0F3F6", color: "var(--af-navy)", padding: "6px 12px", fontSize: 12.5 };
const on: React.CSSProperties = { background: "var(--af-navy)", color: "#fff" };
const emptyForm = { name: "", profile_url: "", platforms: ["linkedin"], topics: [] as string[], notes: "" };

export default function CreatorKitsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [library, setLibrary] = useState<LibItem[]>([]);
  const [kits, setKits] = useState<KitRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // creator form
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);

  // kit builder
  const [creatorId, setCreatorId] = useState("");
  const [includeEpisodes, setIncludeEpisodes] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [listenUrl, setListenUrl] = useState("https://profit-streams.com/profit-streams-podcast");
  const [making, setMaking] = useState(false);
  const [made, setMade] = useState<{ slug: string; notes: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, l, k] = await Promise.all([fetch("/api/creators"), fetch("/api/library"), fetch("/api/creatorkits")]);
      const [cb, lb, kb] = await Promise.all([c.json(), l.json(), k.json()]);
      if (!c.ok) throw new Error(cb.error);
      if (!l.ok) throw new Error(lb.error);
      if (!k.ok) throw new Error(kb.error);
      setCreators(cb.creators);
      setLibrary(lb.items);
      setKits(kb.kits);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Could not load.");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const creator = creators.find((c) => c.id === creatorId) || null;

  // Library items ranked by how many of the creator's topics they share
  const matches = useMemo(() => {
    if (!creator) return [];
    return library
      .filter((i) => includeEpisodes || i.kind === "clip")
      .map((i) => ({ item: i, score: i.topics.filter((t) => creator.topics.includes(t)).length }))
      .filter((m) => m.score > 0 || creator.topics.length === 0)
      .sort((a, b) => b.score - a.score || Number(!!b.item.video_url) - Number(!!a.item.video_url));
  }, [creator, library, includeEpisodes]);

  function pickCreator(id: string) {
    setCreatorId(id);
    setMade(null);
    setPicked([]);
  }
  useEffect(() => {
    // pre-select the 3 best matches that have a video
    if (creator && picked.length === 0) {
      setPicked(matches.filter((m) => m.item.video_url).slice(0, 3).map((m) => m.item.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorId, matches.length]);

  async function saveCreator(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(editingId ? `/api/creators/${editingId}` : "/api/creators", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json();
    if (!res.ok) { setError(body.error); return; }
    setForm({ ...emptyForm });
    setEditingId(null);
    load();
  }

  async function deleteCreator(c: Creator) {
    if (!confirm(`Remove ${c.name}? Kits already sent to them keep working.`)) return;
    await fetch(`/api/creators/${c.id}`, { method: "DELETE" });
    if (creatorId === c.id) setCreatorId("");
    load();
  }

  async function makeKit() {
    setMaking(true);
    setMade(null);
    setError(null);
    try {
      const res = await fetch("/api/creatorkits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator_id: creatorId, item_ids: picked, listen_url: listenUrl }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not make the kit.");
      const notes: string[] = [];
      if (body.usedFallback) notes.push("Some captions used a simple template (AI was unavailable) — worth a quick read before sending.");
      if (body.missingVideo?.length) notes.push(`No video link yet for: ${body.missingVideo.join(", ")} — add it in the Content Library, then make the kit again.`);
      setMade({ slug: body.slug, notes });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMaking(false);
    }
  }

  async function reviewKit(slug: string, review: "approve" | "unapprove") {
    let reviewer = "";
    if (review === "approve") {
      const ok = confirm(
        "Before approving, check:\n• captions read naturally and say Profit Streams®\n• nothing is made up\n• every video opens\n\nApprove and make the creator's link live?"
      );
      if (!ok) return;
      reviewer = prompt("Your name (recorded with the approval):", "Tanisk Pandey") || "";
      if (!reviewer.trim()) return;
    }
    const res = await fetch(`/api/creatorkits/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review, reviewer }),
    });
    const body = await res.json();
    if (!res.ok) setError(body.error || "Could not update the review.");
    load();
  }

  async function deleteKit(slug: string) {
    if (!confirm("Delete this kit? Its link will stop working.")) return;
    await fetch(`/api/creatorkits/${slug}`, { method: "DELETE" });
    load();
  }

  const kitUrl = made ? `${typeof window !== "undefined" ? window.location.origin : ""}/creatorkit/${made.slug}` : "";

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST — INTERNAL</p>
          <h1>Creator Kits</h1>
          <p>Pick a creator, and Podforge picks the clips that match their niche and writes captions in their voice.</p>
        </div>
      </header>

      <div className="wrap" style={{ padding: "8px 24px 100px" }}>
        {error && <div className="error-banner">{error}</div>}

        {/* ---------- MAKE A KIT ---------- */}
        <div className="section">
          <h2>Make a kit</h2>
          {creators.length === 0 ? (
            <p className="hint">Add a creator below first.</p>
          ) : (
            <>
              <div className="field">
                <label>Creator</label>
                <select value={creatorId} onChange={(e) => pickCreator(e.target.value)}>
                  <option value="">— choose —</option>
                  {creators.map((c) => <option key={c.id} value={c.id}>{c.name}{c.topics.length ? ` · ${c.topics.join(", ")}` : ""}</option>)}
                </select>
              </div>

              {creator && (
                <>
                  <div className="field">
                    <label>Clips that match {creator.name}&apos;s topics</label>
                    <p className="sub">
                      Best matches first. Pick up to {MAX_ITEMS}. Items without a Drive video link can&apos;t be watched by the creator.{" "}
                      <label style={{ fontWeight: 400, display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <input type="checkbox" checked={includeEpisodes} onChange={(e) => setIncludeEpisodes(e.target.checked)} style={{ width: "auto" }} />
                        include full episodes
                      </label>
                    </p>
                    {matches.length === 0 && (
                      <p className="hint">Nothing in the Content Library matches these topics yet.</p>
                    )}
                    {matches.map(({ item, score }) => {
                      const checked = picked.includes(item.id);
                      const full = !checked && picked.length >= MAX_ITEMS;
                      return (
                        <label key={item.id} style={{
                          display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0",
                          borderBottom: "1px solid var(--line)", fontWeight: 400, opacity: full ? 0.5 : 1,
                        }}>
                          <input type="checkbox" checked={checked} disabled={full} style={{ width: "auto", marginTop: 3 }}
                            onChange={() => setPicked((p) => (checked ? p.filter((x) => x !== item.id) : [...p, item.id]))} />
                          <span style={{ flex: 1 }}>
                            <strong style={{ fontSize: 14 }}>{item.title}</strong>
                            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                              {" "}· {item.kind}{item.guest_name ? ` · ${item.guest_name}` : ""} · {score} matching topic{score === 1 ? "" : "s"}
                              {item.video_url ? "" : " · ⚠️ no video link"}
                            </span>
                            <br />
                            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{item.topics.join(" · ")}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="field">
                    <label>Listen link used in the credit line</label>
                    <p className="sub">The show page by default — paste the episode&apos;s Spotify/Apple link instead if you have it.</p>
                    <input type="text" value={listenUrl} onChange={(e) => setListenUrl(e.target.value)} />
                  </div>

                  <button type="button" onClick={makeKit} disabled={making || picked.length === 0}>
                    {making ? "Writing captions…" : `Make kit for ${creator.name} (${picked.length} item${picked.length === 1 ? "" : "s"})`}
                  </button>
                </>
              )}

              {made && (
                <div style={{ marginTop: 18, padding: 14, background: "#ECFDF3", borderRadius: 8 }}>
                  <p style={{ margin: "0 0 8px", fontWeight: 700 }}>✅ Kit drafted. Preview it, then Approve it under &quot;Kits sent&quot; below. The link only works for the creator after approval:</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="text" readOnly value={kitUrl} style={{ flex: 1, fontSize: 13 }} />
                    <button type="button" onClick={() => { navigator.clipboard.writeText(kitUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <a href={`/creatorkit/${made.slug}`} target="_blank" rel="noreferrer"><button type="button" style={ghost}>Preview ↗</button></a>
                  </div>
                  {made.notes.map((n) => <p key={n} style={{ margin: "8px 0 0", fontSize: 13 }}>⚠️ {n}</p>)}
                </div>
              )}
            </>
          )}
        </div>

        {/* ---------- CREATORS ---------- */}
        <div className="section">
          <h2>Creators</h2>
          {creators.map((c) => (
            <div key={c.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0", display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <strong>{c.name}</strong>
                <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}> · {c.platforms.join(" + ")}</span>
                {c.profile_url && <> · <a href={c.profile_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>profile ↗</a></>}
                <br />
                <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{c.topics.join(" · ") || "no topics yet"}</span>
                {c.notes && <><br /><span style={{ fontSize: 12.5 }}>{c.notes}</span></>}
              </div>
              <button type="button" style={ghost} onClick={() => {
                setEditingId(c.id);
                setForm({ name: c.name, profile_url: c.profile_url || "", platforms: c.platforms, topics: c.topics, notes: c.notes || "" });
              }}>Edit</button>
              <button type="button" style={{ ...ghost, color: "#B42318" }} onClick={() => deleteCreator(c)}>Remove</button>
            </div>
          ))}

          <form onSubmit={saveCreator} style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <p style={{ fontWeight: 700, margin: "0 0 10px" }}>{editingId ? "Edit creator" : "Add a creator"}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="field">
                <label>Profile link</label>
                <input type="text" value={form.profile_url} placeholder="https://www.linkedin.com/in/…" onChange={(e) => setForm({ ...form, profile_url: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Posts on</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["linkedin", "instagram"].map((p) => (
                  <button key={p} type="button"
                    style={{ ...ghost, ...(form.platforms.includes(p) ? on : {}) }}
                    onClick={() => setForm({ ...form, platforms: form.platforms.includes(p) ? form.platforms.filter((x) => x !== p) : [...form.platforms, p] })}>
                    {p === "linkedin" ? "LinkedIn" : "Instagram"}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Their niche (topics they post about)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {TOPICS.map((t) => (
                  <button key={t} type="button"
                    style={{ ...ghost, ...(form.topics.includes(t) ? on : {}) }}
                    onClick={() => setForm({ ...form, topics: form.topics.includes(t) ? form.topics.filter((x) => x !== t) : [...form.topics, t] })}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Notes (only you see these)</label>
              <input type="text" value={form.notes} placeholder="e.g. agreed to share 2 posts/month; prefers Instagram Collab posts"
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button type="submit">{editingId ? "Save changes" : "Add creator"}</button>
            {editingId && (
              <button type="button" style={{ ...ghost, marginLeft: 8 }} onClick={() => { setEditingId(null); setForm({ ...emptyForm }); }}>Cancel</button>
            )}
          </form>
        </div>

        {/* ---------- PAST KITS ---------- */}
        {kits.length > 0 && (
          <div className="section">
            <h2>Kits (approve before sending)</h2>
            {kits.map((k) => (
              <div key={k.slug} style={{ borderTop: "1px solid var(--line)", padding: "8px 0", display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
                <span style={{ flex: 1 }}>
                  <strong>{k.creator_name}</strong> · {k.item_count} item{k.item_count === 1 ? "" : "s"} · {new Date(k.created_at).toLocaleDateString()}{" "}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                    background: k.status === "approved" ? "#ECFDF3" : "#FFF4E5", color: k.status === "approved" ? "#0E8A50" : "#B54708",
                  }}>
                    {k.status === "approved" ? `APPROVED${k.reviewed_by ? ` · ${k.reviewed_by}` : ""}` : "DRAFT"}
                  </span>
                </span>
                {k.status === "approved" ? (
                  <button type="button" style={ghost} onClick={() => reviewKit(k.slug, "unapprove")}>Back to draft</button>
                ) : (
                  <button type="button" onClick={() => reviewKit(k.slug, "approve")} style={{ padding: "6px 12px", fontSize: 12.5 }}>Approve</button>
                )}
                <a href={`/creatorkit/${k.slug}`} target="_blank" rel="noreferrer"><button type="button" style={ghost}>Open ↗</button></a>
                <button type="button" style={{ ...ghost, color: "#B42318" }} onClick={() => deleteKit(k.slug)}>Delete</button>
              </div>
            ))}
          </div>
        )}

        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
