---
title: AI helper — Guest Kit Extractor
type: skill
owner: tanisk-pandey
status: accepted
updated: 2026-10-06
related: ai-skill-standard, 0001-free-ai-groq
---

# AI helper — Guest Kit Extractor

- **One job:** read an episode transcript and draft the title, hook, summary, exactly 10 takeaways, best quote,
  guest title, and a list of resources that *need* links.
- **Never:** invents URLs (it names what needs a link; a human adds it).
- **Instructions live in:** `lib/groq.ts`
- **Owner:** Tanisk Pandey
- **Human check:** kit review before approval (review standard); links added by a person.
- **Measure:** how much of each draft gets rewritten before approval (track informally for now).
