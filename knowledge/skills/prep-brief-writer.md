---
title: AI helper — Prep Brief Writer
type: skill
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: ai-skill-standard, production-assistant
---

# Prep Brief Writer

- **One job:** before a recording, draft a short brief for the host: who the guest is, why they fit,
  8 fresh questions, up to 3 related past episodes, and the guest's books/resources.
- **Never:** invents facts — it may only use the guest's intake answers and the Content Library list.
- **Instructions live in:** `lib/helpers/prepBrief.ts`
- **Owner:** Tanisk Pandey
- **Human check:** saved as a draft; a person edits and approves before it goes to the host.
- **Measure:** approved vs. dismissed, and how much gets edited.
