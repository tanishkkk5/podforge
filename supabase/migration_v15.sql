-- MIGRATION v15 — Saturday launches + 24-hour share window (decision 0015).
alter table episodes add column if not exists published_at timestamptz;          -- set when an episode is marked Published
alter table guest_intakes add column if not exists share_commitment boolean not null default false; -- "I'll share on launch day"
