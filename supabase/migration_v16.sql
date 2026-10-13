-- MIGRATION v16 — store the Riverside studio link on each recording, so the
-- guest sees it on their form and confirmation page (not only in the email).
alter table recording_sessions add column if not exists riverside_url text;
