---
title: Scheduling a recording
type: process
owner: tanisk-pandey
status: accepted
updated: 2026-10-13
related: episode-production, 0008-record-on-riverside, 0012-guests-book-on-host-calendar-after-intake
---

# Scheduling a recording

**Standard way (decision 0012):**
1. In Podforge → **New Submissions**, pick the host under **Guest intake link** and click **Copy link**
   (e.g. `…/?host=luke`). Send it to the guest.
2. The guest fills in the intake form, then books a slot on the host's calendar on the thank-you page.
   The host is the invite organizer automatically.
3. In **New Submissions** the guest shows **"📅 Booked a time with …"**. Check the host's calendar for the slot.
   If it says **"Not booked yet"** after a day or two, follow up with the guest.
4. Make sure the invite has the **Riverside** studio link (decision 0008).

**If the guest has their own scheduling link** (Calendly etc.): check the host's real calendar yourself first,
then book on the guest's link. Don't email back and forth proposing times — it puts extra work on the guest
(Luke's explicit feedback).

**Pre-scheduled guests** (time already agreed, e.g. Luke booked it directly):
1. Podforge → **Schedule Guest** (`/admin`): guest name + email, host, date & time, and **the time zone you mean**
   (default US Pacific). Check the preview line — it shows the time in Pacific, Eastern and IST.
2. Optional: paste the Riverside studio link. Click **Create Session Link**.
3. **Copy email** (or **Copy link**) and send it to the guest yourself. The guest's page shows the time in *their*
   time zone and leads to the intake form — with no calendar step, so they can't double-book.
4. Their answers (bio, headshot, links, books) appear under **New Submissions → Scheduled guests** once they fill it in.
5. Add the Riverside link to the calendar invite, and update the production tracker.

Time zones matter: before Oct 2026 the time was saved without a time zone and stored as UTC (11:30 showed as
5:00 PM IST). The page now converts using the chosen zone, and the server rejects times without one.
