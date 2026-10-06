---
title: AI helper — Outreach Drafter
type: skill
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: ai-skill-standard, guest-outreach-message
---

# Outreach Drafter

- **One job:** draft Luke's guest invitation using the standard template, with one personalized line.
- **Never:** adds facts that aren't in the notes a person typed; never sends anything. The AI writes only the
  one personal sentence — the rest is the fixed template (`knowledge/templates/guest-outreach-message.md`).
- **Instructions live in:** `lib/helpers/outreach.ts`
- **Owner:** Tanisk Pandey
- **Human check:** saved as a draft in Production Assistant; a person approves and sends it from Luke's account.
- **Measure:** reply rate compared with the generic template (0 of the first 10 generic messages got a reply).
