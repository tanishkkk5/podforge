-- MIGRATION v17 — Episode Studio (decision 0016).
-- Run once in Supabase → SQL Editor. Safe to run twice.
--  transcript      the (auto-fixed) transcript, so Title / takeaways / captions can be refreshed later
--  headshot_url    the guest's photo (from their intake form or an upload), reused when images are rebuilt
--  intake_id       which intake form the episode was started from
--  captions        edited captions per post: { "title": { "li": "...", "ig": "..." }, ... }
--  hashtags        hashtags added to every guest caption
--  amazon_in_guest_posts  whether guest captions carry the tagged Profit Streams® book link (+ #ad line)
alter table guest_kits add column if not exists transcript text;
alter table guest_kits add column if not exists headshot_url text;
alter table guest_kits add column if not exists intake_id uuid references guest_intakes(id) on delete set null;
alter table guest_kits add column if not exists captions jsonb not null default '{}'::jsonb;
alter table guest_kits add column if not exists hashtags text;
alter table guest_kits add column if not exists amazon_in_guest_posts boolean not null default true;
