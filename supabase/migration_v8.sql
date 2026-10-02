-- MIGRATION v8 — Content Library: every full episode and short clip,
-- with its transcript, auto-assigned topics, and a link to its video
-- in Google Drive (videos themselves are NOT stored in Supabase).

create table if not exists media_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('episode', 'clip')),
  title text not null,
  episode_label text,                 -- e.g. "Ep-50"
  guest_name text,
  parent_id uuid references media_items(id) on delete set null,  -- clip -> its episode
  video_url text,                     -- Google Drive share link
  transcript text not null,
  summary text,                       -- one-line AI summary
  topics text[] not null default '{}',
  tag_status text not null default 'pending'  -- pending | tagged | failed | edited
);

create index if not exists media_items_topics_idx on media_items using gin (topics);
create index if not exists media_items_parent_idx on media_items (parent_id);

alter table media_items enable row level security;
drop policy if exists "Service role full access media_items" on media_items;
create policy "Service role full access media_items" on media_items for all using (true) with check (true);
