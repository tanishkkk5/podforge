---
title: Use Groq's free AI tier for content extraction
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-06
related: 0002-switch-to-gpt-oss-model, guest-kit-extractor
---

# 0001 — Use Groq's free AI tier for content extraction

**Decided:** 2026-09 · **Gates tripped:** chooses a core tool

**Context:** the Guest Kit Generator needs an AI to pull titles, takeaways, quotes and resources from transcripts. Podforge has no budget line.

**Decision:** use Groq's free API (OpenAI-compatible) for all AI steps.

**Alternatives:** a paid API (e.g. Claude or OpenAI); doing extraction by hand.

**Rationale:** free with no credit card, fast, and good enough quality for drafts that a human reviews anyway.

**Consequences:** hard limit of 8,000 tokens per minute — long transcripts are trimmed or sampled, and bulk tagging runs about one episode per minute. For very long transcripts, paste into Claude chat instead. Groq can retire models without much notice (see 0002).

**Status:** accepted
