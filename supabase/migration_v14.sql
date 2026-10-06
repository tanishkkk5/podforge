-- MIGRATION v14 — Phase 3 + 4: Riverside drop folder, Drive episode folders,
-- guest/creator posting tracking, weekly podcast stats (decision 0014).

alter table episodes add column if not exists drive_folder_id text;
alter table episodes add column if not exists guest_posted_at timestamptz;
alter table episodes add column if not exists guest_post_url text;

alter table creator_kits add column if not exists posted_at timestamptz;
alter table creator_kits add column if not exists post_url text;

-- Riverside files Podforge has already processed from the Drive drop folder
create table if not exists drop_files (
  file_id text primary key,
  name text not null,
  episode_id uuid references episodes(id) on delete set null,
  processed_at timestamptz not null default now()
);

-- Weekly numbers copied from Spotify for Creators and Apple Podcasts Connect
create table if not exists podcast_stats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  week_of date not null,                       -- the Monday of that week
  platform text not null check (platform in ('spotify', 'apple')),
  followers_total integer,
  plays_7d integer,
  latest_episode_plays integer,
  entered_by text,
  notes text,
  unique (week_of, platform)
);

alter table drop_files enable row level security;
alter table podcast_stats enable row level security;
drop policy if exists "Service role full access drop_files" on drop_files;
drop policy if exists "Service role full access podcast_stats" on podcast_stats;
create policy "Service role full access drop_files" on drop_files for all using (true) with check (true);
create policy "Service role full access podcast_stats" on podcast_stats for all using (true) with check (true);
