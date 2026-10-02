-- MIGRATION v9 — framework links in the Content Library + Creator Kits.

-- Applied Frameworks frameworks mentioned in each transcript (auto-detected)
alter table media_items add column if not exists frameworks text[] not null default '{}';

-- Other content creators we share clips with, and what they post about
create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  profile_url text,
  platforms text[] not null default '{linkedin}',   -- linkedin | instagram
  topics text[] not null default '{}',               -- from the fixed topic list
  notes text
);

-- A finished, shareable pack of clips + captions picked for one creator.
-- Items are a snapshot, so the creator's page never changes unexpectedly.
create table if not exists creator_kits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text not null unique,
  creator_id uuid references creators(id) on delete set null,
  creator_name text not null,
  topics text[] not null default '{}',
  listen_url text,
  items jsonb not null
);

alter table creators enable row level security;
alter table creator_kits enable row level security;
drop policy if exists "Service role full access creators" on creators;
drop policy if exists "Service role full access creator_kits" on creator_kits;
create policy "Service role full access creators" on creators for all using (true) with check (true);
create policy "Service role full access creator_kits" on creator_kits for all using (true) with check (true);
