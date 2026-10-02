"use client";

import { useState } from "react";
import { drivePreviewUrl } from "@/lib/drive";

interface KitItem {
  item_id: string;
  kind: string;
  title: string;
  guest_name: string | null;
  episode_label: string | null;
  video_url: string | null;
  summary: string | null;
  topics: string[];
  frameworks: { name: string; url: string }[];
  captions: { linkedin: string; instagram: string };
}

function CaptionBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <textarea readOnly value={text} style={{ minHeight: 150, fontSize: 13.5, lineHeight: 1.55 }} />
      <button
        type="button"
        style={{ marginTop: 8 }}
        onClick={() => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
      >
        {copied ? "Copied!" : "Copy caption"}
      </button>
    </div>
  );
}

function ItemCard({ item, n }: { item: KitItem; n: number }) {
  const [platform, setPlatform] = useState<"linkedin" | "instagram">("linkedin");
  const [watch, setWatch] = useState(false);
  const preview = drivePreviewUrl(item.video_url);
  const tab = (p: "linkedin" | "instagram", label: string) => (
    <button
      type="button"
      onClick={() => setPlatform(p)}
      style={{
        background: platform === p ? "var(--af-navy)" : "#F0F3F6",
        color: platform === p ? "#fff" : "var(--ink-soft)",
        padding: "6px 14px",
        fontSize: 13,
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="section">
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", margin: "0 0 4px", letterSpacing: 0.5 }}>
        {n}. {item.kind === "clip" ? "CLIP" : "EPISODE"}
        {item.guest_name ? ` · ${item.guest_name.toUpperCase()}` : ""}
      </p>
      <h2 style={{ marginTop: 0 }}>{item.title}</h2>
      {item.summary && <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>{item.summary}</p>}

      {preview ? (
        <>
          {watch ? (
            <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden", background: "#000", marginBottom: 10 }}>
              <iframe src={preview} allow="autoplay; fullscreen" allowFullScreen title={item.title}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button type="button" onClick={() => setWatch(!watch)}>{watch ? "Hide video" : "▶ Watch"}</button>
            <a href={item.video_url!} target="_blank" rel="noreferrer">
              <button type="button" style={{ background: "#F0F3F6", color: "var(--af-navy)" }}>Download from Google Drive ↗</button>
            </a>
          </div>
        </>
      ) : (
        <p className="hint">Video link coming soon.</p>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {tab("linkedin", "LinkedIn")}
        {tab("instagram", "Instagram")}
      </div>
      <CaptionBox text={platform === "linkedin" ? item.captions.linkedin : item.captions.instagram} />

      {item.frameworks.length > 0 && (
        <p style={{ fontSize: 13, marginTop: 12 }}>
          Frameworks mentioned:{" "}
          {item.frameworks.map((f, i) => (
            <span key={f.url}>
              {i > 0 && ", "}
              <a href={f.url} target="_blank" rel="noreferrer">{f.name} ↗</a>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export default function CreatorKitClient({ kit }: { kit: any }) {
  const items: KitItem[] = kit.items || [];
  const first = (kit.creator_name || "").split(" ")[0];
  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">PROFIT STREAMS® PODCAST · CONTENT KIT</p>
          <h1>Hi {first} — a few clips picked for your audience</h1>
          <p>
            {kit.topics?.length ? `Chosen for what you post about: ${kit.topics.join(", ")}. ` : ""}
            Each one comes with ready-to-post captions you can copy, edit, or rewrite in your own voice.
          </p>
        </div>
      </header>

      <div className="wrap" style={{ padding: "8px 24px 100px" }}>
        <div className="section" style={{ background: "#F5FAFE" }}>
          <h2 style={{ marginTop: 0 }}>How to use this kit</h2>
          <p style={{ fontSize: 14.5, margin: "0 0 6px" }}>
            You&apos;re welcome to post any of these clips on your own channels — <strong>free to share with credit</strong>.
            The credit line and episode link are already in each caption; please keep them in.
          </p>
          <p style={{ fontSize: 14.5, margin: 0 }}>
            Tagging Luke Hohmann on LinkedIn, or using an Instagram Collab post, helps both audiences find each other.
            Questions? Email tpandey@appliedframeworks.com.
          </p>
        </div>

        {items.map((item, i) => <ItemCard key={item.item_id} item={item} n={i + 1} />)}

        {kit.listen_url && (
          <p style={{ textAlign: "center" }}>
            <a href={kit.listen_url} target="_blank" rel="noreferrer">Listen to the Profit Streams® Podcast ↗</a>
          </p>
        )}
        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
