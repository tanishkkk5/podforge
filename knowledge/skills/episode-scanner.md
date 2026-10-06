---
title: AI helper — Episode Scanner (chapters + clips)
type: skill
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: ai-skill-standard, clip-finder, 0014-riverside-drop-folder-and-manual-stats
---

# Episode Scanner

- **One job:** read an episode's Riverside captions in parts and mark (a) where new topics start — the chapters —
  and (b) the best 20–90 second clip moments. One AI call per part does both.
- **Never:** invents a time or quote — it only names block numbers; times and words come from the file.
  Chapters are spaced at least 90 seconds apart, max 14, always starting at 00:00.
- **Instructions live in:** `lib/helpers/episodeScan.ts` · runs inside the **Episode Pipeline** page.
- **Owner:** Tanisk Pandey
- **Human check:** chapters appear in the draft guest kit's show notes; clip suggestions are a draft to approve.
