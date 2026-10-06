---
title: AI helper — Production Assistant (orchestrator)
type: skill
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: ai-skill-standard, 0013-production-assistant-drafts-only
---

# Production Assistant (orchestrator)

- **One job:** look at every episode, intake and guest kit, and list what needs a person next.
- **Never:** moves a stage, links a kit, or sends anything by itself — it only suggests.
- **Rules live in:** `lib/episodes.ts` (`suggestNextSteps`) — plain rules, no AI.
- **Owner:** Tanisk Pandey
- **Human check:** every suggestion needs a click (Accept / Draft it / Start tracking).
- **What it notices:** new intakes to track · a guest booked → Booked · a matching guest kit → link it ·
  kit drafted / approved → move stage · no booking after 2 days → offer a follow-up · Booked → offer a prep brief ·
  Recorded without a kit → remind to export the Riverside transcript and generate the kit.
- **Measure:** how many suggestions are accepted vs. "Not now".
