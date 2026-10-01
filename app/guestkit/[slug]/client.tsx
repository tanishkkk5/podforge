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
  const summaryCaptions = {
    li: `${kit.hook}\n\nThat's the big idea from this week's Profit Streams® Podcast with ${kit.guest_name}.\n\nFull episode link in comments 🎧\n\n#ProfitStreamsPodcast #Leadership`,
    ig: `${kit.hook} 💡\n\nNew episode with ${kit.guest_name} — link in bio 🎧\n\n.\n.\n.\n#ProfitStreamsPodcast #Leadership #Podcast`,
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
