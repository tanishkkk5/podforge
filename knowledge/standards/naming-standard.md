---
title: Naming standard
type: standard
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: metadata-standard
---

# Naming standard

**Purpose:** anyone (or any AI) can guess where a file lives and what it is from its name alone.

**Rules:**
- Lowercase, words joined with hyphens, `.md` — e.g. `episode-production.md`.
- Name a file by **what it is**, not who wrote it or when.
- Decisions: `NNNN-short-name.md`, numbered in order (`0011-…`). Numbers are never reused, even if a decision is superseded.
- Meetings: `YYYY-MM-DD-short-name.md`.
- AI helpers: `[what-it-does].md` in `skills/`.
- Database changes: `supabase/migration_vN.sql`, next number, never edit an old one.
- The `title:` in the header is the human-friendly name; the file name stays short.

**Examples:** `decisions/0006-sunday-publishing.md` · `meetings/2026-10-05-arcario-ai-native-workshop.md`

**Enforcement:** reviewed by eye when a file is added; the header check confirms every file has a title and type.

**Owner:** Tanisk Pandey

**Change log:**
- 2026-10-07 — written down (the rules were already followed).
