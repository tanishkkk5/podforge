---
title: A fixed list of 10 topics; the AI cannot invent new ones
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: content-library-tagger
---

# 0004 — A fixed list of topics

**Decided:** 2026-10 · **Gates tripped:** defines a term, sets a convention

**Context:** episodes and clips are tagged by topic so they can be filtered and matched to creators.

**Decision:** only the 10 topics in `lib/topics.ts` can be used. Anything else the AI suggests is dropped.

**Alternatives:** free-form AI tags; tags typed by hand.

**Rationale:** free-form tags drift ("pricing" vs "monetization" vs "price strategy") and break filtering and creator matching.

**Consequences:** the same list now also tags guest kits and each of their takeaways (amended 2026-10-07). Adding or renaming a topic is a deliberate change to `lib/topics.ts` (record it here). Older items keep their tags until retagged.

**Status:** accepted
