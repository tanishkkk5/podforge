-- MIGRATION v11 — topic tags on guest kits (same fixed list as the Content
-- Library; decision 0004). Episode-level topics + one topic per takeaway,
-- so kits can be filtered by topic and takeaways matched to creators.
alter table guest_kits add column if not exists topics text[] not null default '{}';
alter table guest_kits add column if not exists takeaway_topics jsonb not null default '[]'::jsonb;
create index if not exists guest_kits_topics_idx on guest_kits using gin (topics);
