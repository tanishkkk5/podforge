---
title: Links and the Amazon affiliate tag
type: standard
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: show-notes-lenny-format, 0015-saturday-launch-24h-share-window-affiliate-rules
---

# Links and the Amazon affiliate tag

**Purpose:** a wrong link damages trust with guests and listeners; the affiliate tag earns revenue on book links.

**Rules:**
1. **Never invent a link.** If a URL isn't confirmed (search result, or a person clicked through), leave it
   blank and flag it. The AI identifies *what* needs a link; a human supplies the real URL.
2. Every Amazon link carries `?tag=profitstrea0b-20`.
3. Short Amazon links (`a.co/…`, `amzn.to/…`) can't carry the tag — click through and use the full amazon.com URL.
4. Applied Frameworks framework mentions link to their page on appliedframeworks.com (list in `lib/frameworks.ts`).
5. Always-include links: the Profit Streams® book, profit-streams.com, profit-streams.com/training, Luke's LinkedIn.
6. **Disclosure wherever an Amazon link appears** — show notes: "As an Amazon Associate, Applied Frameworks earns
   from qualifying purchases." (added automatically, before any links); LinkedIn: "#ad · As an Amazon Associate,
   we earn from qualifying purchases."
7. **Amazon affiliate links only on AF's own registered places:** episode notes and AF's **LinkedIn** page.
   **Never** on Instagram (not registered), **never** in emails to guests, **never** in guest captions.
8. Plain calls to action only ("📘 Get the book") — no rewards or "support us" asks; never ask guests or colleagues
   to buy through AF's link.

**Enforcement:** Podforge leaves missing links out of show notes and lists them under "Still missing";
`withAffiliateTag()` adds the tag automatically; short links are flagged.

**Owner:** Tanisk Pandey

**Change log:**
- 2026-09 — "never fabricate a link" rule set after an unverifiable short link.
- 2026-10-06 — written down as a standard; framework links added.
- 2026-10-07 — Amazon Associates rules added (decision 0015).
