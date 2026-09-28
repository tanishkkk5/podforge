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
}

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

function AssetCard({
  title,
  imageUrl,
  captions,
}: {
  title: string;
  imageUrl: string;
  captions: { li: string; ig: string };
}) {
  const [platform, setPlatform] = useState<"li" | "ig">("li");
  return (
    <div className="section">
      <h2>{title}</h2>
      <img
        src={imageUrl}
        alt={title}
        style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto 16px", borderRadius: 8, border: "1px solid var(--line)" }}
      />
      <a href={imageUrl} download style={{ display: "inline-block", marginBottom: 16 }}>
        <button type="button">Download Image</button>
      </a>
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
    </div>
  );
}

export default function GuestKitClient({ kit }: { kit: Kit }) {
  const epTag = `EP-${kit.episode_number}`;

  const titleCaptions = {
    li: `${kit.hook}\n\nIn this episode of the Profit Streams® Podcast, ${kit.guest_name} joins ${kit.host_name} to talk about it.\n\nFull episode link in comments 🎧\n\n#ProfitStreamsPodcast #Leadership`,
    ig: `${kit.hook} 🎧\n\nNew episode with ${kit.guest_name} is live now — link in bio.\n\n.\n.\n.\n#ProfitStreamsPodcast #Leadership #Podcast`,
  };
  const quoteCaptions = {
    li: `"${kit.best_quote}"\n\n— ${kit.guest_name}, on this week's Profit Streams® Podcast\n\nFull episode link in comments.\n\n#ProfitStreamsPodcast #Leadership`,
    ig: `Said it best 👆\n\nNew episode with ${kit.guest_name} is live now — link in bio 🎧\n\n.\n.\n.\n#Leadership #QuoteOfTheDay #ProfitStreamsPodcast`,
  };
  const takeawaysCaptions = {
    li: `10 things ${kit.guest_name} taught us on the Profit Streams® Podcast 👇\n\nSwipe through — full conversation with ${kit.host_name} is out now, link in comments.\n\n#ProfitStreamsPodcast #Leadership`,
    ig: `10 lessons from our latest episode 🧠\n\nSwipe ➡️ for all 10. New episode live now — link in bio 🎧\n\n.\n.\n.\n#ProfitStreamsPodcast #Leadership`,
  };
  const chaptersCaptions = {
    li: `Here's exactly what we covered with ${kit.guest_name} this week — timestamped, so you can jump to what matters to you.\n\nFull episode link in comments 🎧\n\n#ProfitStreamsPodcast`,
    ig: `Full episode breakdown ⏱️ — swipe to see what we cover, minute by minute.\n\nNew episode live now — link in bio 🎧\n\n.\n.\n.\n#ProfitStreamsPodcast`,
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
        </div>
      </header>

      <div className="wrap">
        <AssetCard title="1. Episode Announcement" imageUrl={kit.image_urls.title_card} captions={titleCaptions} />
        <AssetCard title="2. Quote Card" imageUrl={kit.image_urls.quote_card} captions={quoteCaptions} />
        {kit.image_urls.takeaways.length > 0 && (
          <AssetCard
            title={`3. Key Takeaways (${kit.image_urls.takeaways.length} slides — download each)`}
            imageUrl={kit.image_urls.takeaways[0]}
            captions={takeawaysCaptions}
          />
        )}
        {kit.image_urls.chapters.length > 0 && (
          <AssetCard title="4. Episode Chapters" imageUrl={kit.image_urls.chapters[0]} captions={chaptersCaptions} />
        )}

        <footer>Applied Frameworks · Profit Streams® Podcast</footer>
      </div>
    </>
  );
}
