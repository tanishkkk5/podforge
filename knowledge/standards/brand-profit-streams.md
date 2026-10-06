---
title: Brand spelling — Profit Streams®
type: standard
owner: tanisk-pandey
status: accepted
updated: 2026-10-06
related: show-notes-lenny-format
---

# Brand spelling — Profit Streams®

**Purpose:** the brand is a registered trademark; misspellings look careless and weaken it.

**Rule:** always write **Profit Streams®** — plural "Streams", capitalized, with ®.
Do **not** add ® to "value streams" (a generic Lean/Agile term, not our brand).

**Examples — common transcription errors to fix:**
| Wrong | Right |
|---|---|
| Prophet Streams | Profit Streams® |
| profit stream | Profit Streams® |
| Profit Stream® | Profit Streams® |
| Profit Streams (no ®) | Profit Streams® |

**Enforcement:** `fixBrand()` in `lib/showNotes.ts` corrects show notes, AI summaries and creator captions
automatically, and `fixTranscript()` in `lib/transcriptFixes.ts` fixes every transcript as it enters Podforge
(also "Skilled Agile" → "Scaled Agile"). Names are not auto-fixed — use the Transcript Checker. Every AI prompt also instructs the spelling. A human still checks before approving a kit.

**Owner:** Tanisk Pandey

**Change log:**
- 2026-09 — rule set after repeated transcript errors.
- 2026-10-06 — written down as a standard.
- 2026-10-07 — transcripts are now fixed automatically on upload.
