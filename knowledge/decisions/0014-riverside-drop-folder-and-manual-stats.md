---
title: Riverside files arrive via a Drive drop folder; Spotify/Apple stats are entered weekly
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: episode-production, weekly-stats, episode-scanner
---

# 0014 — Riverside drop folder + weekly stats check-in

**Decided:** 2026-10 · **Gates tripped:** chooses a core tool, sets a convention, changes how people work

**Context:** the goal is to automate everything after a recording, and to track new listeners and followers.
- Riverside's API is Business-plan only; AF is on **Pro**. Riverside's MCP also excludes Free and Pro plans, and is
  built for chat assistants, not background apps.
- Spotify for Creators and Apple Podcasts Connect have **no official public analytics API**; the workarounds are
  unofficial, need copied login cookies, and break.
- A "web crawler" / robot browser logging into Riverside, Spotify or Apple would need stored passwords, fails on
  two-step login, breaks when sites change, and usually breaks their terms of service.

**Decision:**
- After each recording, a person drops Riverside's `.srt` export into a shared Google Drive folder (one click).
  Podforge notices it and the Episode Pipeline turns it into chapters, a guest kit and clip suggestions — all drafts.
- Podforge creates each episode's Drive folders (Main Podcast, Magic Clips). Videos are still moved by hand
  (too large for the free hosting).
- Spotify and Apple numbers are copied into Podforge once a week (Weekly Stats); Podforge draws the trends.

**Alternatives:** Riverside Business plan (~$5,400+/yr, industry estimate); unofficial scrapers; doing it all by hand.

**Rationale:** free, reliable, and within every platform's rules; the one manual click is the cheapest step.

**Consequences:** revisit if AF upgrades Riverside (Business API would remove the drop step) or if Spotify/Apple
publish analytics APIs. A free open-source download counter (OP3) could add automatic cross-app download counts
if the podcast host adds its prefix to the feed — a separate decision.

**Status:** accepted
