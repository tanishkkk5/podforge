-- MIGRATION v12 — guests book their recording on the host's HubSpot calendar
-- right after the intake form (decision 0012).
alter table guest_intakes add column if not exists host text;               -- host key, e.g. 'luke'
alter table guest_intakes add column if not exists booked_at timestamptz;   -- when the guest finished booking (not the meeting time)
