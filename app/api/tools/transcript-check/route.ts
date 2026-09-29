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

    const { data: knownNames, error: namesError } = await supabase
      .from("known_names")
      .select("name");
    if (namesError) {
      console.error("known_names fetch failed:", namesError.message);
      return NextResponse.json(
        { error: `Could not load known names: ${namesError.message}` },
        { status: 500 }
      );
    }

    const { data: knownResources, error: resourcesError } = await supabase
      .from("known_resources")
      .select("label, url")
      .eq("always_include", true);
    if (resourcesError) {
      console.error("known_resources fetch failed:", resourcesError.message);
    }

    const names = (knownNames || []).map((r) => r.name);

    // Surface a clear, visible signal if the known-names list is empty —
    // this is exactly the state that silently caused "no misspellings
    // found" for every transcript regardless of content.
    if (names.length === 0) {
      return NextResponse.json(
        {
          error:
            "The known-names list is empty (0 names loaded from the database). " +
            "This means either migration_v3.sql was never run, or the app is " +
            "connected to a different Supabase project than the one it was run in. " +
            "Nothing can be checked until this is fixed.",
        },
        { status: 500 }
      );
    }
    const candidates = extractCandidates(transcript);

    // Flag any candidate that's CLOSE to a known name but not an exact match —
    // that's the "Mick Kirsten vs Mik Kersten" case.
    const flagged: Array<{ found: string; suggested: string; distance: number }> = [];
    const exactMatches = new Set(names);

    // Common transcript filler/acronym words that shouldn't count toward a
    // fuzzy match on their own — avoids "IT Luke Hohmann" or "So Mike Gilpin"
    // false positives, where a stray word gets glued onto an already-correct name.
    const FILLER_WORDS = new Set(["it", "mm", "so", "pl", "or", "in", "and", "the", "a", "an"]);

    for (const candidate of candidates) {
      if (exactMatches.has(candidate)) continue; // already correct, skip
      if (candidate.length < 4) continue; // too short to fuzzy-match meaningfully

      // If the LAST word or last two words of this candidate already exactly
      // match a known name on their own, the real name is already correct —
      // the extra leading word is just noise from the sentence before it.
      const words = candidate.split(" ");
      const lastOne = words.slice(-1).join(" ");
      const lastTwo = words.slice(-2).join(" ");
      if (exactMatches.has(lastOne) || exactMatches.has(lastTwo)) continue;

      // Skip candidates that are just a filler word plus a name (checked above)
      // or are themselves a filler word.
      if (words.length === 1 && FILLER_WORDS.has(words[0].toLowerCase())) continue;

      let bestMatch: string | null = null;
      let bestDistance = Infinity;
      for (const known of names) {
        // Only compare names of similar length to avoid nonsense matches.
        // Also require the known name to be at least 5 characters — short
        // names like "Kevin" alone produce too many false positives against
        // unrelated short words.
        if (known.length < 5) continue;
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
