# How changes are made

Podforge's knowledge (`knowledge/`) and code are managed the same way: **proposed, checked, versioned.**

## The flow
1. Make the change (code, or a file in `knowledge/`).
2. Own your output: **read your own change before anyone else has to** — especially anything AI wrote.
3. Run locally:
   - `node scripts/check-knowledge.mjs` — every knowledge file has a valid header
   - `npm run build` — the app still builds
4. Commit with a message that says what changed and why. Push.
5. GitHub runs the same two checks automatically (`.github/workflows/check.yml`).
   **If the check is red, fix it before anything else.**
6. Vercel deploys from `main`.

## Adding to `knowledge/`
- Start from the header in `knowledge/standards/metadata-standard.md`.
- **Decisions:** first check whether a record already covers it (then amend it). Otherwise, if it trips any
  gate (broad scope · costly to reverse · changes how people work · chooses a core tool · sets a convention ·
  changes who decides · says no or not yet · reverses an earlier decision · touches a commitment · defines a
  term or number), write a new record using `knowledge/decisions/0000-template.md`.
- Never delete an old decision. Mark it `superseded` and point to the new one.
- Organize by **what a thing is**, not who wrote it or when. If it won't matter in six months, it doesn't belong here.

## Database changes
Add a new `supabase/migration_vN.sql` (never edit old ones) and note it in the commit message.
