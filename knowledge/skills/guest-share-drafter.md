---
title: AI helper — Guest Share Drafter
type: skill
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: ai-skill-standard, review-standard
---

# Guest Share Drafter

- **One job:** draft the Friday email that sends a guest their approved kit ("goes live tomorrow", first 24 hours
  matter most), and — if they haven't posted 24 hours after launch — a friendly reminder. Never includes Amazon links.
- **Never:** uses AI (fixed templates) or sends anything.
- **Instructions live in:** `lib/helpers/guestShare.ts`
- **Owner:** Tanisk Pandey
- **Human check:** approve, then send it yourself. Tick **"Mark guest posted"** in Production Assistant when they
  post — that stops the reminder and feeds the results.
- **Measure:** share rate (guests who posted ÷ kits sent). Guests "rarely" posted before this.
