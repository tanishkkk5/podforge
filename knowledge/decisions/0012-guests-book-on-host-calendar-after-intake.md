---
title: Guests book their recording on the host's calendar right after the intake form
type: decision
owner: tanisk-pandey
status: accepted
updated: 2026-10-07
related: guest-scheduling, 0008-record-on-riverside
---

# 0012 — Guests book on the host's calendar after the intake form

**Decided:** 2026-10 · **Gates tripped:** changes how people work, touches a commitment (how guests are scheduled)

**Context:** guests filled in the intake form, then we scheduled the recording separately. Luke's feedback: don't email back and forth proposing times — book through the host's own scheduling link. Booking from someone else's calendar also made the wrong person the invite organizer.

**Decision:** after a direct intake submission, the thank-you page embeds the host's HubSpot booking calendar (pre-filled with the guest's name and email). The host comes from the intake link (`/?host=luke`); with no host in the link it defaults to Luke. Guests who arrive through a pre-scheduled `?token=` link skip this step. When HubSpot signals a successful booking, Podforge stamps `booked_at` on the submission.

**Alternatives:** keep scheduling manually from New Submissions; send the booking link in a follow-up email.

**Rationale:** one smooth step for the guest, no back-and-forth, and the host is automatically the organizer of the invite.

**Consequences:**
- HubSpot's signal says *that* a meeting was booked, not *when* — the time is on the host's calendar (and in HubSpot), not in Podforge.
- The host's HubSpot meeting link must include the **Riverside** recording link in its location/description (decision 0008), or the invite won't have it — confirm in the host's HubSpot meeting settings.
- New hosts need their HubSpot meetings link added to `lib/hosts.ts`.
- Team members testing the form should not book a slot — it creates a real meeting.

**Status:** accepted
