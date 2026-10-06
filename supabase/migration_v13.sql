-- MIGRATION v13 — Production Assistant (decision 0013): an episode tracker
-- plus a log of everything the agent drafts. The agent only DRAFTS; a person
-- approves every step in the Podforge dashboard.

create table if not exists episodes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  guest_name text not null,
  guest_email text,
  host_key text not null default 'luke',
  episode_number text,
  intake_id uuid references guest_intakes(id) on delete set null,
  guest_kit_slug text,
  stage text not null default 'intake'
    check (stage in ('intake', 'booked', 'recorded', 'kit', 'approved', 'published')),
  notes text
);

create table if not exists agent_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  episode_id uuid references episodes(id) on delete cascade,
  helper text not null,            -- prep_brief | follow_up
  title text,
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'dismissed')),
  reviewed_by text,
  reviewed_at timestamptz
);

create index if not exists agent_drafts_episode_idx on agent_drafts (episode_id);

alter table episodes enable row level security;
alter table agent_drafts enable row level security;
drop policy if exists "Service role full access episodes" on episodes;
drop policy if exists "Service role full access agent_drafts" on agent_drafts;
create policy "Service role full access episodes" on episodes for all using (true) with check (true);
create policy "Service role full access agent_drafts" on agent_drafts for all using (true) with check (true);
