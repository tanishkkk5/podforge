---
title: Read the whole transcript in parts on the free AI tier
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-16
related: 0001-free-ai-groq, 0002-switch-to-gpt-oss-model, 0016-episode-studio
---

# 0019: Read the whole transcript in parts on the free AI tier

**Decided:** 2026-10-16 by Tanisk · **Gates tripped:** changes how every episode is drafted

**Context:** Groq's free tier allows 8,000 tokens per minute, so kits for long episodes were drafted from only the
first ~23,000 characters of the transcript.

**Decision:** (`lib/condense.ts`)
1. Clean the transcript first (no AI): drop Riverside timestamps, repeated speaker headers and pure fillers
   (um, uh). Meaningful phrases stay.
2. Short episodes (under ~23,000 characters after cleanup): one request, as before.
3. Long episodes: split into ~18,000-character parts; the AI writes compact notes for each part (ideas, verbatim
   quotes, resources, guest facts), one part per minute; then the episode is drafted from ALL the notes.
   A 60-minute episode takes about 4 to 5 minutes; the page shows a countdown and retries if the limit is hit.
4. The notes are kept with the kit (extras.digest), so ✨ refresh of titles, takeaways and quotes also covers the whole episode.

**Consequences:** still $0. Slower for long episodes, but nothing is cut off.
