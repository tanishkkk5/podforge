---
title: Real quotes with timestamps, explainer slides, refresh rebuilds images
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-17
related: 0016-episode-studio, 0017-voice-bold-icons
---

# 0020: Real quotes with timestamps, explainer slides, refresh rebuilds images

**Decided:** 2026-10-17 by Tanisk · **Gates tripped:** changes what guests post

**Context:** quote cards could show AI-written lines, had no timestamp, and lines like Mike Gilpin's "MQ" made no
sense out of context. Refresh on the guest page changed captions but not images.

**Decision:**
1. **Real quotes only** (`lib/quotes.ts`): candidates are sentences the guest said (Riverside speaker + time headers),
   with an estimated timestamp. The AI only picks candidate numbers; it never writes a quote. A first-draft quote that
   can't be matched word for word is flagged for a person to pick.
2. **Minimal quote card**: quote, name, title, "▶ 23:41". The caption says when it was said.
3. **Explainer slide** for jargon or a new technology in the quote ("Swipe: what does MQ mean?"): meaning + example,
   from the episode first, general knowledge only when the episode doesn't explain it (flagged for review).
4. **"New version"** on the guest kit preview changes the content of that post AND rebuilds its images.
5. **Download all takeaways**: 10 PNG slides + one PDF carousel (LinkedIn carousels are PDF document posts).
