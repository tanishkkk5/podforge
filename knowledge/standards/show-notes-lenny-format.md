---
title: Show notes — Lenny format
type: standard
owner: tanisk-pandey
status: accepted
updated: 2026-10-06
related: brand-profit-streams, links-and-affiliate-tag, 0007-lenny-format-show-notes
---

# Show notes — Lenny format

**Purpose:** every episode's show notes look the same, are complete, and help listeners find the guest,
the resources and related episodes.

**Rule — sections, in this order:**
1. Title: `Ep-XX [specific title] — with [Guest]`
2. One-line hook (the most surprising idea)
3. Guest bio + what the episode explores (2–3 sentences)
4. "In this conversation, we discuss:" — numbered, 6–10 items
5. Recommended Books (Amazon links with affiliate tag)
6. Resources — every named tool/company/framework, plus the three standard Profit Streams® links
7. Where to find [Guest]
8. Where to find [Host]
9. "In this episode, we cover:" — chapters with timestamps
10. Related Episodes + Listen / Spotify / Apple links
11. "Production and marketing by Applied Frameworks."

Not included (by decision): transcript links, sponsor section, named recurring segment.

**Examples:** generated automatically by Podforge → Guest Kits & Show Notes → open a kit.

**Enforcement:** `buildShowNotes()` in `lib/showNotes.ts` builds this exact structure and lists anything
missing. A human reviews before publishing.

**Owner:** Tanisk Pandey

**Change log:**
- 2026-09 — format locked as the standard for every episode.
- 2026-10-06 — written down as a standard.
