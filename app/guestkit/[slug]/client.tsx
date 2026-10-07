"use client";

import { useState } from "react";

interface Kit {
  slug: string;
  episode_number: string;
  guest_name: string;
  guest_title: string;
  host_name: string;
  title: string;
  hook: string;
  summary: string;
  takeaways: string[];
  chapters: { time: string; title: string }[];
  best_quote: string;
  image_urls: {
    title_card: string;
    summary_card: string;
    quote_card: string;
    thumbnail: string;
    takeaways: string[];
    chapters: string[];
  };
  extras?: { spotifyUrl?: string; appleUrl?: string } | null;
}

// Guests share the EPISODE link — never Applied Frameworks' Amazon affiliate
// link (Amazon only allows it on AF's own registered sites; decision 0015).
// The book links live in the episode notes, with the required disclosure.
const LISTEN_PAGE = "https://profit-streams.com/profit-streams-podcast";
const episodeLink = (k: Kit) => k.extras?.spotifyUrl?.trim() || k.extras?.appleUrl?.trim() || LISTEN_PAGE;

function CaptionBlock({ platform, text }: { platform: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 10,
        fontSize: 13.5,
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        background: "#FAFCFE",
      }}
    >
      {text}
      <br />
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        style={{
          background: copied ? "#0E8A50" : "var(--af-navy)",
          marginTop: 10,
          padding: "6px 14px",
          fontSize: 12.5,
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// Supabase Storage forces a real file download (instead of opening the
// image in a new tab) when "?download=<filename>" is appended.
function downloadUrl(url: string, filename: string) {
  return `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(filename)}`;
}

function AssetCard({
  title,
  images,
  filePrefix,
  captions,
}: {
  title: string;
  images: string[];
  filePrefix: string;
  captions?: { li: string; ig: string };
}) {
  const [platform, setPlatform] = useState<"li" | "ig">("li");
  const multi = images.length > 1;
  return (
    <div className="section">
      <h2>{title}</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: multi ? "repeat(auto-fill, minmax(150px, 1fr))" : "1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {images.map((url, i) => {
          const name = multi ? `${filePrefix}-${i + 1}.png` : `${filePrefix}.png`;
          return (
            <div key={url} style={{ textAlign: "center" }}>
              <img
                src={url}
                alt={multi ? `${title} — slide ${i + 1}` : title}
                style={{
                  width: "100%", maxWidth: multi ? 220 : 340, display: "block",
                  margin: "0 auto 8px", borderRadius: 8, border: "1px solid var(--line)",
                }}
              />
              <a href={downloadUrl(url, name)}>
                <button type="button" style={multi ? { padding: "6px 12px", fontSize: 12.5 } : undefined}>
                  {multi ? `Download ${i + 1}` : "Download Image"}
                </button>
              </a>
            </div>
          );
        })}
      </div>
      {captions && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => setPlatform("li")}
              style={{ background: platform === "li" ? "var(--af-navy)" : "#F0F3F6", color: platform === "li" ? "#fff" : "var(--ink-soft)", padding: "6px 14px", fontSize: 13 }}
            >
              LinkedIn
            </button>
            <button
              type="button"
              onClick={() => setPlatform("ig")}
              style={{ background: platform === "ig" ? "var(--af-navy)" : "#F0F3F6", color: platform === "ig" ? "#fff" : "var(--ink-soft)", padding: "6px 14px", fontSize: 13 }}
            >
              Instagram
            </button>
          </div>
          <CaptionBlock platform={platform} text={platform === "li" ? captions.li : captions.ig} />
        </>
      )}
    </div>
  );
}

export default function GuestKitClient({ kit }: { kit: Kit }) {
  const epTag = `EP-${kit.episode_number}`;

  const link = episodeLink(kit);
  // LinkedIn: link in the post · Instagram: links aren't clickable in captions
  const liEnd = `🎧 Listen: ${link}\n📘 The book we discussed is linked in the episode notes.\n\n#ProfitStreamsPodcast #Leadership`;
  const igEnd = `🎧 Search "Profit Streams Podcast" on Spotify or Apple Podcasts.\n📘 The book we discussed is linked in the episode notes.\n.\n.\n.\n#ProfitStreamsPodcast #Leadership #Podcast`;

  const titleCaptions = {
    li: `${kit.hook}\n\nI joined ${kit.host_name} on the Profit Streams® Podcast to talk about it.\n\n${liEnd}`,
    ig: `${kit.hook} 🎧\n\nMy conversation with ${kit.host_name} on the Profit Streams® Podcast is out now.\n\n${igEnd}`,
  };
  const quoteCaptions = {
    li: `"${kit.best_quote}"\n\nFrom my conversation with ${kit.host_name} on the Profit Streams® Podcast.\n\n${liEnd}`,
    ig: `Said on the Profit Streams® Podcast 👆\n\n${igEnd}`,
  };
  const takeawaysCaptions = {
    li: `10 ideas from my conversation with ${kit.host_name} on the Profit Streams® Podcast 👇\n\nSwipe through — the full episode is out now.\n\n${liEnd}`,
    ig: `10 lessons from my Profit Streams® Podcast episode 🧠 Swipe ➡️ for all 10.\n\n${igEnd}`,
  };
  const summaryCaptions = {
    li: `${kit.hook}\n\nThat's the big idea from my episode of the Profit Streams® Podcast with ${kit.host_name}.\n\n${liEnd}`,
    ig: `${kit.hook} 💡\n\n${igEnd}`,
  };
  const chaptersCaptions = {
    li: `Here's everything ${kit.host_name} and I covered on the Profit Streams® Podcast — timestamped, so you can jump to what matters to you.\n\n${liEnd}`,
    ig: `Episode breakdown ⏱️ — swipe to see what we covered, minute by minute.\n\n${igEnd}`,
  };

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="kicker">{epTag} · PROFIT STREAMS® PODCAST</p>
          <h1>Your Guest Kit</h1>
          <p>
            Thanks for joining, {kit.guest_name.split(" ")[0]}! Everything below is ready to
            download and post — pick whichever caption feels most like you.
          </p>
          <p style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.12)", borderRadius: 8 }}>
            🚀 <strong>Launch weekend:</strong> your episode goes live on <strong>Saturday at 7:30 AM ET</strong>. Posting within the
            first 24 hours is the single biggest boost for its reach — thank you!
          </p>
        </div>
      </header>

      <div className="wrap">
        <AssetCard title="1. Episode Announcement" images={[kit.image_urls.title_card]} filePrefix={`${epTag}-announcement`} captions={titleCaptions} />
        {kit.image_urls.summary_card && (
          <AssetCard title="2. The Big Idea" images={[kit.image_urls.summary_card]} filePrefix={`${epTag}-big-idea`} captions={summaryCaptions} />
        )}
        <AssetCard title="3. Quote Card" images={[kit.image_urls.quote_card]} filePrefix={`${epTag}-quote`} captions={quoteCaptions} />
        {kit.image_urls.takeaways.length > 0 && (
          <AssetCard
            title={`4. Key Takeaways Carousel (${kit.image_urls.takeaways.length} slides — post them together, in order)`}
            images={kit.image_urls.takeaways}
            filePrefix={`${epTag}-takeaway`}
            captions={takeawaysCaptions}
          />
        )}
        {kit.image_urls.chapters.length > 0 && (
          <AssetCard
            title="5. Episode Chapters"
            images={kit.image_urls.chapters}
            filePrefix={`${epTag}-chapters`}
            captions={chaptersCaptions}
          />
        )}
        {kit.image_urls.thumbnail && (
          <AssetCard title="6. Episode Thumbnail (high resolution)" images={[kit.image_urls.thumbnail]} filePrefix={`${epTag}-thumbnail`} />
        )}

        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
