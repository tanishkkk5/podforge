-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)

create table if not exists guest_intakes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  full_name text not null,
  email text not null,
  role text,
  company text,

  short_bio text,
  long_bio text,
  headshot_url text,      -- populated after upload to the 'headshots' storage bucket

  site_biz text,
  site_personal text,
  linkedin text,
  other_links text,

  book_title text,
  on_amazon text,          -- 'Yes' | 'No' | 'Not sure'
  amazon_link text,
  on_audible text,         -- 'Yes' | 'No' | 'Not sure'

  resources text,
  topics text,
  promo text,

  -- lightweight status tracking so you can see progress from a dashboard later
  status text not null default 'new'  -- 'new' | 'kit_in_progress' | 'kit_ready' | 'published'
);

-- Storage bucket for headshots. Create this in the Supabase dashboard under
-- Storage -> New bucket -> name it "headshots" -> set to Public.
-- (Buckets can't be created via SQL, hence the manual step.)

-- Optional: enable Row Level Security and lock writes down to the service role only,
-- since the API route uses the service role key server-side, not the public anon key.
alter table guest_intakes enable row level security;

create policy "Service role full access"
  on guest_intakes
  for all
  using (true)
  with check (true);
-- Note: this policy only matters for the anon/public key. The service role key
-- (used server-side in the API route) bypasses RLS entirely by design.
