---
title: Production Assistant — drafts everything, a person approves every step
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: production-assistant, prep-brief-writer, follow-up-drafter, review-standard
---

# 0013 — Production Assistant: drafts only, every step approved

**Decided:** 2026-10 · **Gates tripped:** changes how people work, chooses a core tool, sets a convention

**Context:** we want end-to-end automation of episode production. The AI-native workshop's lesson: agents
should have one job and one human owner, and earn more freedom only after proving themselves.

**Decision:**
- An episode tracker with six stages: Intake → Booked → Recorded → Kit drafted → Kit approved → Published.
- A "Production Assistant" dashboard that works out what's needed **each time it's opened** (no scheduled jobs, no emails).
- The agent only **suggests** stage moves and **drafts** content; a person clicks Accept / Approve for every step.
- Helpers, each with one job: Follow-up Drafter (fixed template, no AI), Prep Brief Writer (AI, intake facts only),
  since phase 2: Clip Finder and Outreach Drafter; since phases 3–4: Episode Scanner, Social Pack Writer and
  Guest Share Drafter (see decision 0014).
- Every draft is logged with who approved or dismissed it.

**Alternatives:** fully automatic agent; email digests on a schedule; doing it all by hand.

**Rationale:** the owner chose "draft everything, I approve each step" and "dashboard only". It keeps the
show's relationships safe while the helpers prove themselves, and costs nothing (no cron, free Groq).

**Consequences:** nothing happens unless someone opens the dashboard. Recording and publishing stay human.
Transcripts come from Riverside exports. When a helper's approval rate is consistently high, revisit giving it
more freedom (a new decision).

**Status:** accepted
