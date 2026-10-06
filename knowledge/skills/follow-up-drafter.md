---
title: AI helper — Follow-up Drafter
type: skill
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: ai-skill-standard, production-assistant, guest-scheduling
---

# Follow-up Drafter

- **One job:** draft a friendly nudge for a guest who hasn't booked a recording time 2+ days after their intake.
- **Never:** sends anything; never uses AI (a fixed template), so nothing can be made up.
- **Instructions live in:** `lib/helpers/followUp.ts`
- **Owner:** Tanisk Pandey
- **Human check:** saved as a draft; a person approves, copies it into an email draft, and sends it themselves.
- **Measure:** how often a follow-up leads to a booking.
