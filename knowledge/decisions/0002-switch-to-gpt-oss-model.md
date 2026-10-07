---
title: Switch to openai/gpt-oss-120b after Groq retired Llama 3.3
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: 0001-free-ai-groq
---

# 0002 — Switch to `openai/gpt-oss-120b`

**Decided:** 2026-08 · **Gates tripped:** reverses an earlier decision, chooses a core tool

**Context:** Groq decommissioned `llama-3.3-70b-versatile` in August 2026; the generator started failing with `404 model_not_found`.

**Decision:** use `openai/gpt-oss-120b` on Groq for every AI call.

**Alternatives:** other Groq models; moving to a paid provider.

**Rationale:** current production model on Groq's free tier, returns clean JSON, similar quality.

**Consequences:** every AI call now goes through one file, `lib/groqClient.ts` — if a `model_not_found` error appears again, check `console.groq.com/docs/models` and change the model name there only.

**Amended 2026-10-07:** this model "thinks" before answering and the thinking counts against the answer budget. With a small budget it can return an empty answer, which Groq rejects as `json_validate_failed` (seen live on the Outreach Drafter). `groqClient.ts` now asks for short thinking (`reasoning_effort: low`), gives helpers larger budgets, retries once when the answer is empty or not valid JSON, and drops `reasoning_effort` automatically if Groq ever rejects it.

**Status:** accepted (supersedes the original Llama 3.3 choice)
