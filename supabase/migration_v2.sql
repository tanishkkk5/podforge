-- MIGRATION v2 — run this in Supabase SQL Editor (your table already exists,
-- this only adds what's new; it will not affect existing data)

-- 1. Add multi-book support (old single-book columns stay, in case any
--    existing rows used them — new submissions use the "books" column)
alter table guest_intakes add column if not exists books jsonb;

-- 2. New table: recording sessions (scheduling a guest to a date/host)
create table if not exists recording_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  token text not null unique,        -- part of the guest's unique link
  guest_name text,
  guest_email text not null,
  host_name text not null,           -- e.g. "Luke Hohmann", "Jason Tanner"
  scheduled_at timestamptz not null, -- the proposed recording date/time

  status text not null default 'scheduled',
  -- 'scheduled' | 'reschedule_requested' | 'intake_submitted' | 'completed'

  reschedule_note text,              -- guest's message if they request a new time
  created_by text                    -- who set this up (Tanisk, Luke, Laura, Kevin...)
);

alter table recording_sessions enable row level security;

create policy "Service role full access sessions"
  on recording_sessions
  for all
  using (true)
  with check (true);

-- 3. Link intake submissions back to the session they came from
alter table guest_intakes add column if not exists session_id uuid references recording_sessions(id);
