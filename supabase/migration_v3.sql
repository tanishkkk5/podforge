-- MIGRATION v3 — run in Supabase SQL Editor
-- Adds two reference tables used by the Transcript Checker tool.

-- 1. Known names — hosts, past guests, common company/framework names.
-- The checker fuzzy-matches every capitalized word/phrase in a pasted
-- transcript against this list to catch misspellings (e.g. "Mick Kirsten"
-- vs "Mik Kersten").
create table if not exists known_names (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text default 'person'  -- 'person' | 'company' | 'framework'
);

alter table known_names enable row level security;
create policy "Service role full access known_names"
  on known_names for all using (true) with check (true);

insert into known_names (name, category) values
  ('Luke Hohmann', 'person'),
  ('Jason Tanner', 'person'),
  ('Tanisk Pandey', 'person'),
  ('Laura Caldie', 'person'),
  ('Diane Robinette', 'person'),
  ('Kevin', 'person'),
  ('Mik Kersten', 'person'),
  ('Nir Eyal', 'person'),
  ('Konstantin Popov', 'person'),
  ('Harry Max', 'person'),
  ('Garrick van Buren', 'person'),
  ('Madhavan Ramanujam', 'person'),
  ('April Dunford', 'person'),
  ('Gibson Biddle', 'person'),
  ('Profit Streams', 'framework'),
  ('Applied Frameworks', 'company')
on conflict (name) do nothing;

-- 2. Known resources — links that get reused across many/most episodes.
-- The checker always surfaces these as suggestions for the Resources section.
create table if not exists known_resources (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  always_include boolean not null default true
);

alter table known_resources enable row level security;
create policy "Service role full access known_resources"
  on known_resources for all using (true) with check (true);

insert into known_resources (label, url, always_include) values
  ('Connect with Luke Hohmann on LinkedIn', 'https://www.linkedin.com/in/lukehohmann/', true),
  ('Get the #1 best-selling Profit Streams® book', 'https://www.amazon.com/Software-Profit-Streams-Sustainably-Profitable/dp/1544540671/?tag=profitstrea0b-20', true),
  ('Learn more about Profit Streams®', 'https://profit-streams.com/', true),
  ('Register for Profit Streams® training', 'https://profit-streams.com/training', true)
on conflict do nothing;
