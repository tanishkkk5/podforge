# Podforge — Profit Streams® Podcast production platform

Internal tool for producing the Profit Streams® Podcast at Applied Frameworks:
guest intake and scheduling, guest kits and show notes, a topic-tagged content
library, and creator kits for sharing clips. Owner: **Tanisk Pandey**.

**Working on Podforge (person or AI)? Start with [`CLAUDE.md`](CLAUDE.md)** — the always-on rules.

## The map — what lives where

| Folder / file | What it is |
|---|---|
| `CLAUDE.md` | The constitution: rules every AI session follows. Kept short on purpose. |
| `CONTRIBUTING.md` | How changes are proposed, checked and released. |
| `CODEOWNERS` | Who reviews each area. |
| `knowledge/standards/` | The rules: brand spelling, show-notes format, links, review, metadata, AI helpers. |
| `knowledge/decisions/` | Decision records — what we chose, the alternatives, and **why**. |
| `knowledge/processes/` | How the work actually runs, step by step (episode production, scheduling, deploying). |
| `knowledge/skills/` | One page per AI helper: its one job, its owner, and how a human checks it. |
| `knowledge/templates/` | Reusable starting points: decision record, outreach message, captions, reports. |
| `knowledge/onboarding/` | Start here if you're new. |
| `knowledge/domains/` | What we sell: our frameworks (`ip/`) and brand + approved messaging (`marketing/`). |
| `knowledge/meetings/` | Notes from meetings that shaped how we work. |
| `app/` | The website: pages (`app/admin/...`, `app/guestkit/...`) and APIs (`app/api/...`). |
| `lib/` | Shared logic: show notes builder, topic list, framework links, AI calls. |
| `supabase/` | Database changes (`migration_vN.sql`) — run in order in the Supabase SQL Editor. |
| `scripts/check-knowledge.mjs` | The automatic check that every knowledge file has a proper header. |

**New here?** Start with [`knowledge/onboarding/start-here.md`](knowledge/onboarding/start-here.md).

## What Podforge does

| Page | Who sees it | Purpose |
|---|---|---|
| `/` | Guests | Pre-recording intake form |
| `/session/[token]` | Guests | Recording confirmation / reschedule |
| `/guestkit/[slug]` | Guests (once **approved**) | Their finished kit: images + captions |
| `/creatorkit/[slug]` | Outside creators (once **approved**) | Niche-matched clips + captions |
| `/admin/*` | Team (login) | Scheduling, submissions, kit generator, guest kits & show notes, content library, creator kits |
| `/tools/*` | Team | Transcript name checker, Ask Archive search |

Stack: Next.js 14 · Supabase (Postgres + Storage) · Groq (free AI) · Resend (email) · Vercel.
Environment variables are listed in `.env.example`.
