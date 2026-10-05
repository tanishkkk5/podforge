---
title: AI helper — Content Library Tagger
type: skill
owner: tanisk-pandey
status: accepted
updated: 2026-10-06
related: ai-skill-standard, 0004-fixed-topic-list
---

# AI helper — Content Library Tagger

- **One job:** pick 1–3 topics (from the fixed list) and write a one-line summary for an episode or clip.
- **Never:** uses a topic outside `lib/topics.ts` (extra topics are dropped automatically).
- **Instructions live in:** `lib/topicTagger.ts`
- **Owner:** Tanisk Pandey
- **Human check:** topic chips are editable in the Content Library; edited items are marked "edited".
- **Measure:** the Content Library shows the Tagger's correction rate (items a human had to fix ÷ items tagged).
  Low and stable → trust it more; high → improve its instructions.
