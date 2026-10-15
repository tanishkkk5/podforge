import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { groqJson, GroqRateLimitError } from "@/lib/groqClient";
import { fixBrand } from "@/lib/showNotes";
import { noDashes, POSTS, PostKey } from "@/lib/guestCaptions";

// Login required (middleware.ts). "✨ Refresh" buttons in the Episode Studio (decision 0016).
// Returns NEW suggestions only; nothing is saved until a person picks one and clicks Save.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Free Groq tier: 8,000 tokens/minute (input + output) for the whole account.
const TRANSCRIPT_BUDGET = 18000; // ~4,500 tokens

const RULES = `House rules: write "Profit Streams®" exactly (with ®) whenever the brand appears; never put ® on "value streams". Never use em-dashes or en-dashes. Never use the word "honest". No clickbait, no ALL CAPS, no emojis unless asked. Only use facts from the episode.`;

function excerpt(t: string): string {
  if (!t) return "";
  if (t.length <= TRANSCRIPT_BUDGET) return t;
  // Beginning + middle + end, so the whole conversation is represented
  const third = Math.floor(TRANSCRIPT_BUDGET / 3);
  const mid = Math.floor(t.length / 2 - third / 2);
  return `${t.slice(0, third)}\n[...]\n${t.slice(mid, mid + third)}\n[...]\n${t.slice(-third)}`;
}

const clean = (s: unknown) => noDashes(fixBrand(String(s || "").trim())).replace(/^["']|["']$/g, "");

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const what = String(body.what || "");
    const supabase = getSupabaseAdmin();
    const { data: kit, error } = await supabase.from("guest_kits").select("*").eq("slug", params.slug).single();
    if (error || !kit) return NextResponse.json({ error: "Guest kit not found." }, { status: 404 });

    const about = `Episode of the Profit Streams® Podcast. Host: ${kit.host_name}. Guest: ${kit.guest_name}${kit.guest_title ? ` (${kit.guest_title})` : ""}.
Current title: ${kit.title}
Hook: ${kit.hook}
Summary: ${kit.summary}
Key takeaways:
${(kit.takeaways || []).map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}`;
    const needsTranscript = ["titles", "takeaways", "quote", "description"].includes(what);
    if (needsTranscript && !kit.transcript) {
      // Kits made before the Studio don't have their transcript stored: work from the summary + takeaways
      if (what === "takeaways" || what === "quote") {
        return NextResponse.json({ error: "This kit was made before transcripts were saved. Re-run Step 1 with the transcript to refresh takeaways or the quote." }, { status: 400 });
      }
    }
    const transcriptPart = kit.transcript ? `\n\nTranscript (excerpt):\n${excerpt(kit.transcript)}` : "";

    if (what === "titles") {
      const out = await groqJson({
        prompt: `${about}${transcriptPart}

Write 5 NEW episode title options. Each: under 60 characters, specific to this conversation (a sharp idea, tension, or result the guest talked about), not generic ("Insights on Leadership" is bad), different angles from each other and from the current title. Do not include the guest's name or "Ep". ${RULES}
Respond with JSON only: {"titles": ["...", "...", "...", "...", "..."]}`,
        maxTokens: 900, temperature: 0.9,
      });
      const titles = (Array.isArray(out.titles) ? out.titles : []).map(clean).filter((t: string) => t && t.length <= 90).slice(0, 5);
      if (!titles.length) throw new Error("The AI didn't return titles, please click again.");
      return NextResponse.json({ titles });
    }

    if (what === "description") {
      const out = await groqJson({
        prompt: `${about}${transcriptPart}

Rewrite the episode's hook and summary. hook: one sentence under 25 words, the most surprising or useful idea. summary: 2 to 3 sentences in third person about what the episode covers. ${RULES}
Respond with JSON only: {"hook": "...", "summary": "..."}`,
        maxTokens: 700, temperature: 0.8,
      });
      if (!out.hook || !out.summary) throw new Error("The AI didn't return a description, please click again.");
      return NextResponse.json({ hook: clean(out.hook), summary: clean(out.summary) });
    }

    if (what === "takeaways") {
      const out = await groqJson({
        prompt: `Profit Streams® Podcast. Host ${kit.host_name}, guest ${kit.guest_name}.
Transcript (excerpt):
${excerpt(kit.transcript)}

Write exactly 10 key takeaways, each one complete sentence (under 30 words) with a distinct, concrete idea from the conversation, in the order they come up. ${RULES}
Respond with JSON only: {"takeaways": ["...", ... 10 items]}`,
        maxTokens: 1400, temperature: 0.6, retryMaxTokens: 1800,
      });
      const t = (Array.isArray(out.takeaways) ? out.takeaways : []).map(clean).filter(Boolean);
      if (t.length !== 10) throw new Error(`The AI returned ${t.length} takeaways instead of 10, please click again.`);
      return NextResponse.json({ takeaways: t });
    }

    if (what === "quote") {
      const out = await groqJson({
        prompt: `Profit Streams® Podcast. Guest: ${kit.guest_name}.
Transcript (excerpt):
${excerpt(kit.transcript)}

Pick 3 short, self-contained, quotable lines said by the GUEST (not the host). Each must be copied word for word from the transcript (you may trim filler words like "um", "you know") and be under 200 characters. Avoid this one: "${kit.best_quote}".
Respond with JSON only: {"quotes": ["...", "...", "..."]}`,
        maxTokens: 800, temperature: 0.7,
      });
      const quotes = (Array.isArray(out.quotes) ? out.quotes : []).map((q: unknown) => fixBrand(String(q || "").trim()).replace(/^["“]|["”]$/g, "")).filter((q: string) => q && q.length <= 220).slice(0, 3);
      if (!quotes.length) throw new Error("The AI didn't return quotes, please click again.");
      return NextResponse.json({ quotes });
    }

    if (what === "caption") {
      const post = POSTS.find((p) => p.key === body.post) as { key: PostKey; label: string } | undefined;
      const platform = body.platform === "ig" ? "ig" : "li";
      if (!post) return NextResponse.json({ error: "Unknown post." }, { status: 400 });
      const what2: Record<PostKey, string> = {
        title: "announcing the episode (it goes with the title card image)",
        summary: "sharing the episode's single big idea (it goes with an image of the hook line)",
        quote: `sharing this quote from the episode: "${kit.best_quote}"`,
        takeaways: "introducing a 10-slide carousel of the episode's key takeaways",
        chapters: "introducing a slide with the episode's timestamped chapters",
      };
      const out = await groqJson({
        prompt: `${about}

Write a NEW ${platform === "li" ? "LinkedIn" : "Instagram"} caption for ${kit.guest_name} to post on their own account, ${what2[post.key]}. Write in ${kit.guest_name}'s first-person voice, warm and confident, mention ${kit.host_name} and the Profit Streams® Podcast. ${platform === "li" ? "40 to 90 words, a strong first line, short paragraphs." : "20 to 45 words, 1 or 2 fitting emojis are fine."} Do NOT add hashtags, links, or a call to listen: those are added automatically after your text. ${RULES}
Respond with JSON only: {"caption": "..."}`,
        maxTokens: 700, temperature: 0.9,
      });
      if (!out.caption) throw new Error("The AI didn't return a caption, please click again.");
      return NextResponse.json({ caption: clean(out.caption).replace(/\s*#\w+/g, "").trim() });
    }

    return NextResponse.json({ error: "Unknown refresh type." }, { status: 400 });
  } catch (e: any) {
    console.error(e);
    const status = e instanceof GroqRateLimitError ? 429 : 500;
    return NextResponse.json({ error: e.message || "Refresh failed." }, { status });
  }
}
