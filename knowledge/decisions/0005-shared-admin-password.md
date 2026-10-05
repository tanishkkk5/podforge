---
title: One shared admin password instead of personal accounts
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-06
---

# 0005 — One shared admin password

**Decided:** 2026-09 · **Gates tripped:** changes who decides / who has access

**Context:** every admin form had its own password field, which was repetitive.

**Decision:** log in once at `/admin/login` with one shared password (`ADMIN_PASSWORD`); a cookie keeps you logged in for two weeks. Guests never log in.

**Alternatives:** per-user accounts (e.g. Supabase Auth or Google sign-in).

**Rationale:** small internal team; fastest to build and maintain.

**Consequences:** anyone with the password can do everything, and actions can't be traced to a person (approvals record a typed name instead). Revisit if more people get access. Changing the password = update it in Vercel and redeploy.

**Status:** accepted (known limitation)
