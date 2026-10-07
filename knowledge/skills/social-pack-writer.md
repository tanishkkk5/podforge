---
title: AI helper — Social Pack Writer
type: skill
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: ai-skill-standard, social-captions, approved-messaging
---

# Social Pack Writer

- **One job:** write 3 LinkedIn snippet posts and 2 Instagram captions for the show's own accounts.
- **Never:** adds facts beyond the approved guest kit (title, hook, summary, takeaways, quote). Hashtags, the
  @-guest reminder, the episode link, and — on **LinkedIn only** — the tagged Amazon book link with the
  "#ad · As an Amazon Associate…" disclosure (in a first-comment block) are added by code. Instagram never gets
  an Amazon link (decision 0015).
- **When:** offered only after the guest kit is approved.
- **Instructions live in:** `lib/helpers/socialPack.ts`
- **Owner:** Tanisk Pandey
- **Human check:** draft in Production Assistant; a person approves and posts (replacing @Guest with a real mention).
