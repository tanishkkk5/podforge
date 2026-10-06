---
title: Arcario × Applied Frameworks — "So you want to be AI native?"
type: meeting
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: review-standard, metadata-standard, 0009-human-approval-before-guests-see-kits, 0010-automatic-build-check
---

# Arcario × Applied Frameworks AI-native workshop — 5 Oct 2026

**Who:** Applied Frameworks team with Konstantin, Maxim and Zan (Arcario Group).

**Main ideas (paraphrased):**
- Being AI native isn't about having many AI agents — it's the company being set up so every person can use AI on the same shared knowledge, rules and standards.
- Build bottom-up: (1) one shared knowledge base, (2) define and stabilize tasks before automating, (3) agents with one job and one human owner, given more freedom only after they prove themselves.
- The knowledge base: one source of truth, structured and linked, plain-text documents managed like code (versioned, reviewed, owned).
- Starting order (the staircase): set the rules → capture the why (decision records) → capture how you work → capture what you sell → build AI skills.
- Guardrails: keep it light — one automatic check plus one person who knows the context was enough for them.

**What we changed in Podforge because of it:**
- Added `CLAUDE.md`, a README map, and this `knowledge/` folder with headers on every file.
- Wrote decision records for past choices (0001–0011).
- Added a human approval step before guests or creators see any kit (decision 0009).
- Added one automatic check on every change (decision 0010).
- Gave each AI helper a page with one job and one owner, and a measured correction rate for the Tagger.
