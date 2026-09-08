import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// Simple Levenshtein distance — no external library needed.
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Extract candidate proper-noun phrases (1-3 consecutive capitalized words)
// from the transcript, e.g. "Mick Kirsten", "Applied Frameworks".
function extractCandidates(text: string): string[] {
  const words = text.split(/\s+/);
  const candidates = new Set<string>();
  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i + n <= words.length; i++) {
      const slice = words.slice(i, i + n).map((w) => w.replace(/[^a-zA-Z'-]/g, ""));
      if (slice.every((w) => w.length > 1 && /^[A-Z]/.test(w))) {
        candidates.add(slice.join(" "));
      }
    }
  }
  return Array.from(candidates);
}

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "Transcript text is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: knownNames } = await supabase.from("known_names").select("name");
    const { data: knownResources } = await supabase
      .from("known_resources")
      .select("label, url")
      .eq("always_include", true);

    const names = (knownNames || []).map((r) => r.name);
    const candidates = extractCandidates(transcript);

    // Flag any candidate that's CLOSE to a known name but not an exact match —
    // that's the "Mick Kirsten vs Mik Kersten" case.
    const flagged: Array<{ found: string; suggested: string; distance: number }> = [];
    const exactMatches = new Set(names);

    for (const candidate of candidates) {
      if (exactMatches.has(candidate)) continue; // already correct, skip

      let bestMatch: string | null = null;
      let bestDistance = Infinity;
      for (const known of names) {
        // Only compare names of similar length to avoid nonsense matches
        if (Math.abs(known.length - candidate.length) > 4) continue;
        const dist = levenshtein(candidate.toLowerCase(), known.toLowerCase());
        if (dist < bestDistance) {
          bestDistance = dist;
          bestMatch = known;
        }
      }

      // A distance of 1-3 on a multi-word name is a plausible misspelling;
      // 0 would already have been caught by the exact-match check above.
      if (bestMatch && bestDistance >= 1 && bestDistance <= 3) {
        flagged.push({ found: candidate, suggested: bestMatch, distance: bestDistance });
      }
    }

    // De-duplicate flagged entries
    const seen = new Set<string>();
    const uniqueFlagged = flagged.filter((f) => {
      const key = `${f.found}=>${f.suggested}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      flagged: uniqueFlagged,
      suggestedResources: knownResources || [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
