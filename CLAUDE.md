# Podforge — rules for every AI session (the constitution)

Podforge is the internal production tool for the **Profit Streams® Podcast** at Applied Frameworks.
Owner: Tanisk Pandey (tpandey@appliedframeworks.com). Read `README.md` for the map.

## Always
- Write the brand exactly **Profit Streams®** (plural, ®). Never on "value streams". → `knowledge/standards/brand-profit-streams.md`
- **Never invent a link.** If a URL isn't confirmed, flag it as missing. → `knowledge/standards/links-and-affiliate-tag.md`
- **AI drafts, a human approves.** Nothing reaches a guest or creator until a person marks it Approved. → `knowledge/standards/review-standard.md`
- Emails written for a person (outreach, replies, reports): create **drafts only**, never send. The only emails Podforge sends by itself are automatic system notifications (e.g. guest scheduling confirmations via Resend).
- Before any change goes live: `npm run build` must pass and `node scripts/check-knowledge.mjs` must pass.
- After using a GitHub token, remind the owner to revoke it.
- When something breaks, get the **actual error** (Vercel Runtime Logs) before proposing a fix.

## Never
- Store video in Supabase (videos live in Google Drive — see decision 0003).
- Use Node's `crypto` in `middleware.ts` / `lib/adminAuth.ts` (Edge runtime — use Web Crypto).
- Add topics outside `lib/topics.ts` (fixed list — decision 0004).

## Where things are
New here → `knowledge/onboarding/start-here.md` · Standards → `knowledge/standards/` ·
Why we chose things → `knowledge/decisions/` · How work runs → `knowledge/processes/` ·
Each AI helper → `knowledge/skills/` · Reusable starting points → `knowledge/templates/` ·
What we sell (frameworks, brand, messaging) → `knowledge/domains/` · Meeting notes → `knowledge/meetings/`.
Every file in `knowledge/` starts with a metadata header (`knowledge/standards/metadata-standard.md`).
