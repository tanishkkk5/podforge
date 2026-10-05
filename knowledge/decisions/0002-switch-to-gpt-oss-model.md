---
title: Switch to openai/gpt-oss-120b after Groq retired Llama 3.3
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-06
related: 0001-free-ai-groq
---

# 0002 — Switch to `openai/gpt-oss-120b`

**Decided:** 2026-08 · **Gates tripped:** reverses an earlier decision, chooses a core tool

**Context:** Groq decommissioned `llama-3.3-70b-versatile` in August 2026; the generator started failing with `404 model_not_found`.

**Decision:** use `openai/gpt-oss-120b` on Groq for every AI call.

**Alternatives:** other Groq models; moving to a paid provider.

**Rationale:** current production model on Groq's free tier, returns clean JSON, similar quality.

**Consequences:** if a `model_not_found` error appears again, check `console.groq.com/docs/models` and update every AI call (`lib/groq.ts`, `lib/topicTagger.ts`, `lib/creatorCaptions.ts`).

**Status:** accepted (supersedes the original Llama 3.3 choice)
