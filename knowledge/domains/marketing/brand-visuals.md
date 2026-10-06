---
title: Brand visuals for podcast assets
type: reference
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: social-captions, approved-messaging
---

# Brand visuals for podcast assets

| Element | Value |
|---|---|
| Navy | `#014784` |
| Bright blue | `#00A1EA` |
| Dark text (the "Profit" wordmark) | `#353535` |
| Font | Inter (Bold + Regular), bundled in `public/fonts/` — no external font loading |
| Logo | Swoosh icon, `public/af-swoosh-icon.png` (the old wide `logo.png` was corrupted and retired) |
| Social images | 1080×1080 square (works on LinkedIn and Instagram) |
| Thumbnail | 3000×3000, guest headshot top-left when available |

Colors were sampled from the real logo artwork, not guessed. Podforge's image generator
(`lib/socialAssets.ts`) uses exactly these values.
