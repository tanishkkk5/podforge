---
title: Lenny-style summaries, curiosity-first posts, bold key phrases, one icon pack
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-16
related: 0016-episode-studio, show-notes-lenny-format, social-captions
---

# 0017: Lenny-style summaries, curiosity-first posts, bold key phrases, one icon pack

**Decided:** 2026-10-16 by Tanisk · **Gates tripped:** sets a writing convention

**Decision:**
1. **Summary = Lenny's Podcast style, always** (`lib/styleGuide.ts`): who the guest is, credentials first; one
   sentence of concrete proof from the transcript; then "[Guest] joins [Host] to ...". 3 sentences, under 75 words,
   no hype words. Used by the draft, the ✨ refresh, the show notes and Ask Archive.
2. **Curiosity is the reason to click**: titles, hooks and captions open a loop (surprising claim, specific number,
   tension, a question) and never promise what the episode doesn't deliver.
3. **Bold key phrases**: text can mark 2 to 3 key phrases with `**double asterisks**`. Captions turn them into
   Unicode bold (the only bold LinkedIn/Instagram show; kept to 2 to 3 because it isn't searchable and screen readers
   struggle with it). Image cards draw them bold with a soft highlight. Show notes, Spotify/Apple and Ask Archive
   strip them (plain text).
4. **Icons**: Lucide for every UI icon; official brand marks (Spotify, Apple Podcasts, LinkedIn, Instagram,
   Google Drive, YouTube; `lib/brandIcons.ts`, Simple Icons CC0) only next to links to that platform. **Never a fruit
   emoji for Apple**: captions write "Apple Podcasts" out. Image cards carry the Spotify + Apple Podcasts marks top right.
5. **Ask Archive**: each episode can add its Lenny summary + takeaways + chapters + transcript in one click
   (replaces the previous version, never duplicates).
