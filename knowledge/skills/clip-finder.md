---
title: AI helper — Clip Finder
type: skill
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: ai-skill-standard, production-assistant, episode-production
---

# Clip Finder

- **One job:** suggest the 5 best 20–90 second moments in an episode to cut as short clips.
- **Never:** invents a time or a quote. The AI only picks numbered ~15-second blocks; the start/end times and
  opening words are taken from Riverside's own captions file by code. Picks outside the rules (too short,
  too long, block numbers that don't exist) are thrown away. Overlapping picks are removed.
- **Input:** Riverside's `.srt` export (exact times), or its `.txt` export **with speaker timestamps** — times are then
  estimated within each speaker turn (within a few seconds; turns are capped at a realistic speaking length).
  A `.txt` with no timestamps is refused.
- **Instructions live in:** `lib/helpers/clipFinder.ts` (reading the file: `lib/captions.ts`)
- **Owner:** Tanisk Pandey
- **Human check:** a person watches each moment before cutting; results are saved as a draft for approval.
- **Cost:** one free AI call per ~16,000 characters of transcript (a 1-hour episode ≈ 4 calls, about 1 per minute).
- **Measure:** how many suggested clips actually get cut.
