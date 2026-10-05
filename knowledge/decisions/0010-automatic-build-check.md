---
title: One automatic check on every push; no required reviewer yet
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-06
related: deploying-podforge
---

# 0010 — One automatic check on every push

**Decided:** 2026-10 · **Gates tripped:** changes how people work, sets a convention

**Context:** changes went straight to the live site. Twice, a build error was only caught by testing by hand.

**Decision:** GitHub Actions runs the knowledge-header check and `npm run build` on every push and pull request. No second human reviewer is required for now (one-person team).

**Alternatives:** required reviewer (Robert or Clint); full branch protection with several checks.

**Rationale:** the workshop's lesson — one automated check plus one person who knows the context is enough; don't over-build guardrails.

**Consequences:** a red check means fix before anything else. Revisit a required reviewer when a second person contributes. Note: GitHub branch protection (blocking a bad push entirely) is free on public repos but needs a paid plan on private personal repos.

**Status:** accepted
