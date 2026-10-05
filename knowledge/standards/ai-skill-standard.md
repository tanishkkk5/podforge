---
title: AI helper (skill) standard
type: standard
owner: tanisk-pandey
status: accepted
updated: 2026-10-06
related: review-standard
---

# AI helper (skill) standard

**Purpose:** each AI helper is predictable, owned, and earns trust by being measured — not assumed.

**Rules:** every AI helper in Podforge has a page in `knowledge/skills/` stating:
- its **one job** (and what it must never do)
- its **human owner**
- **where its instructions live** in the code
- **how a human checks it** before output reaches anyone
- **how we measure it** (e.g. how often humans correct it)

A helper gets more freedom (less checking) only after its measured correction rate stays low.

**Enforcement:** new AI calls aren't merged without a skill page.

**Owner:** Tanisk Pandey

**Change log:**
- 2026-10-06 — created.
