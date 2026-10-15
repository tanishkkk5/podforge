---
title: Episode Studio, editable guest kits, Amazon link in guest captions
type: decision
owner: tanisk-pandey
status: draft
updated: 2026-10-16
related: 0009-human-approval-before-guests-see-kits, 0015-saturday-launch-24h-share-window-affiliate-rules, links-and-affiliate-tag, episode-production
---

# 0016: Episode Studio, editable guest kits, Amazon link in guest captions

**Decided:** 2026-10-16 by Tanisk · **Gates tripped:** changes a convention (affiliate links), reverses part of 0015

**Context:** making an episode meant typing the guest, host and episode number by hand, pasting Riverside text,
and living with whatever the AI wrote: titles and captions couldn't be edited or refreshed, the kit had a
Podforge thumbnail nobody used (thumbnails are made in Canva), the guest downloaded images one by one, and the
guest Drive bundle was built by hand.

**Decision:**
1. **One flow, two steps.** `/admin/production` (Episode Studio, step 1): pick the guest from their intake
   form (name, host, photo, title, LinkedIn fill in), the episode number defaults to the last guest kit + 1,
   paste the Riverside transcript + chapters, check names in place, draft. Step 2 is the episode page
   (`/admin/guest-kits/[slug]`) in this order: Title → Episode # → Description (hook, summary, 10 takeaways,
   quote, chapters) → Resources → Links after publishing → Show notes → Guest kit → Drive bundle → Approve.
   The old Guest Kit Generator URL redirects here.
2. **Everything is editable and refreshable** until approval: ✨ buttons return suggestions (5 titles, a new
   hook + summary, a new set of 10 takeaways, 3 quotes, a new caption); nothing changes until a person picks one
   and saves. Saving content rebuilds the images. **Approved = final**: content is locked (links can still be
   added); "Move back to draft" unlocks it.
3. **Captions** are edited and refreshed on the guest kit preview (team only controls). Every caption ends
   with a footer that can't be edited away: Spotify/Apple links (or the episode page), Luke Hohmann's LinkedIn,
   and the Profit Streams® book link with the #ad line (see 5). Hashtags are one editable line per kit.
4. **Download all** (`/api/kitdownload/[slug]`, guests can use it once approved): every image + separate
   LinkedIn and Instagram caption files + README. **No thumbnail** in the kit; it's sent by email for now.
   **Guest Drive bundle** is built by one button: Guest Bundle / 0 START HERE · 1 Posts · 2 Clips ·
   3 Thumbnail · 4 Audio & Transcript, with START HERE, posts, captions and transcript filled in.
5. **Amazon link in guest captions (proposed, overrides 0015 point 3 and 5 for guest captions):** Tanisk asked
   for the tagged book link on every post. It's a per-kit switch, on by default, always with the #ad line.
   **Risk:** Amazon's Associates agreement only allows Special Links on sites listed in AF's account; a
   guest's own LinkedIn/Instagram is not one of them, so this can put the Associates account at risk.
   Needs Luke or Kevin's sign-off; if they say no, untick the switch (or change its default in migration v17).

**Consequences:** migration v17 adds transcript, headshot_url, intake_id, captions, hashtags,
amazon_in_guest_posts to guest_kits. Kits made before v17 can be edited, but refreshing takeaways/quotes needs
the transcript, so re-run step 1 for them.
