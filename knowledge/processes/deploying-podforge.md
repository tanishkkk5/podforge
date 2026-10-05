---
title: Deploying a change to Podforge
type: process
owner: tanisk-pandey
status: accepted
updated: 2026-10-06
related: 0010-automatic-build-check
---

# Deploying a change to Podforge

1. Get a GitHub token: classic with `repo` scope, or fine-grained with this repo selected and
   **Contents: Read and write** (read-only causes a 403).
2. Clone fresh, make the change, then run:
   `npm install --no-audit --no-fund` → `node scripts/check-knowledge.mjs` → `npm run build`. Both must pass.
3. If the change needs the database, add `supabase/migration_vN.sql` and **run it in Supabase before pushing**.
4. Clean up (`rm -rf node_modules .next package-lock.json`), commit, push to `main`.
5. Check the GitHub Actions run is green; Vercel redeploys automatically.
6. Test the live change. If something breaks, read Vercel → Logs for the exact error before fixing.
7. **Revoke the token.**
