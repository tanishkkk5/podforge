-- MIGRATION v5 — Auto-Generated Guest Kits
-- Run in Supabase SQL Editor.

create table if not exists guest_kits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  slug text not null unique,          -- used in the URL: /guestkit/[slug]
  episode_number text,
  guest_name text not null,
  guest_title text,
  host_name text not null,

  title text not null,
  hook text,
  summary text,
  takeaways jsonb not null,           -- array of 10 strings
  chapters jsonb,                     -- array of {time, title}
  best_quote text,

  image_urls jsonb not null,          -- { title_card, summary_card, quote_card, takeaways: [...], chapters: [...] }

  status text not null default 'draft' -- 'draft' | 'sent_to_guest'
);

alter table guest_kits enable row level security;
create policy "Service role full access guest_kits"
  on guest_kits for all using (true) with check (true);

-- Storage bucket for the generated images (create manually in Supabase
-- Dashboard: Storage -> New bucket -> name "guest-kit-assets" -> Public: ON)
