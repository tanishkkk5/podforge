---
title: Five-place navigation and a modern, spacious UI
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-16
related: 0016-episode-studio, 0017-voice-bold-icons
---

# 0018: Five-place navigation and a modern, spacious UI

**Decided:** 2026-10-16 by Tanisk · **Gates tripped:** changes how everyone finds things

**Context:** the sidebar had 15 links, several doing the same job (Guest Kit Generator vs Episode Studio,
Transcript Checker vs "Check names" in the Studio, Upload Transcript vs "Add to Ask Archive").

**Decision:** the sidebar has 5 places; everything else is a tab at the top of the page (`lib/nav.ts`):
- **Home**: What needs you (Production Assistant) · Weekly stats
- **Guests**: Intake forms · Schedule a guest · Open the intake form
- **Episodes**: All episodes · New episode · Import from Drive · Clip finder
- **Content**: Content library · Creator kits
- **Ask Archive**: Ask · Add a transcript · Name checker

Old URLs keep working. The UI moves to cards on a light background, rounded page headers in the brand gradient,
Lucide icons and more white space. Guest-facing pages keep no menu.
