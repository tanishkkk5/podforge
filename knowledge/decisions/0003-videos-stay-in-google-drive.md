---
title: Videos stay in Google Drive; Podforge stores links only
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-06
related: content-library-tagger
---

# 0003 — Videos stay in Google Drive

**Decided:** 2026-10 · **Gates tripped:** chooses a core tool, costly to reverse

**Context:** the Content Library needs every episode and clip to be watchable. Supabase free plan storage is small; video files are large.

**Decision:** videos live in Google Drive. Podforge stores only the Drive link and plays it with Drive's embedded player.

**Alternatives:** upload video to Supabase Storage; YouTube unlisted links.

**Rationale:** no storage cost, videos are already in Drive, one place to manage files.

**Consequences:** each video must be shared as "Anyone with the link can view" or it won't play for creators. Folder links can't be embedded — file links only. Transcripts (small text) are stored in the database.

**Status:** accepted
