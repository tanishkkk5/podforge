---
title: Metadata standard
type: standard
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: review-standard
---

# Metadata standard

**Purpose:** every knowledge file says what it is, who owns it, and whether to trust it — so people and AI
can tell approved from draft, know who to ask, and spot stale content.

**Rule:** every `.md` file in `knowledge/` starts with this header:

```
---
title: Short human name
type: standard | decision | process | skill | template | guide | reference | meeting
owner: firstname-lastname
status: draft | accepted | superseded
updated: YYYY-MM-DD
related: other-file-name, another-file   (optional)
supersedes: older-file-name             (optional)
superseded_by: newer-file-name          (required when status is superseded)
---
```

**Examples:** see any file in this folder.

**Enforcement:** `scripts/check-knowledge.mjs` runs on every push (GitHub Actions) and fails if a header
is missing or invalid. It warns (doesn't fail) when `updated` is older than 180 days.

**Owner:** Tanisk Pandey

**Change log:**
- 2026-10-06 — created, adapted from the Arcario/Applied Frameworks AI-native workshop template.
- 2026-10-07 — added types guide, reference and meeting (onboarding, domains and meeting notes).
