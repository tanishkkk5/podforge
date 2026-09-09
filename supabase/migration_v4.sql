-- MIGRATION v4 — RAG / Transcript Archive Search
-- Run in Supabase SQL Editor. Free to run — pgvector is a built-in Postgres
-- extension, no separate service or cost.

-- 1. Enable the vector extension (built into Postgres/Supabase, no cost)
create extension if not exists vector;

-- 2. Table storing every chunked, embedded piece of every transcript
create table if not exists transcript_chunks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  episode_name text not null,      -- e.g. "Garrick van Buren", "Harry Max"
  source_type text not null,       -- 'main_transcript' | 'magic_clip'
  chunk_index int not null,        -- position of this chunk within the transcript
  content text not null,           -- the actual chunk of text

  embedding vector(1024)           -- Voyage 4 embedding, 1024 dimensions
);

alter table transcript_chunks enable row level security;
create policy "Service role full access transcript_chunks"
  on transcript_chunks for all using (true) with check (true);

-- 3. A Postgres function for similarity search (cosine distance via pgvector's
-- <=> operator). This lets the app ask "what are the N most similar chunks
-- to this question?" directly in the database — fast, and completely free,
-- since it's just a query, not a separate paid service.
create or replace function match_transcript_chunks(
  query_embedding vector(1024),
  match_count int default 8
)
returns table (
  id uuid,
  episode_name text,
  source_type text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    id,
    episode_name,
    source_type,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from transcript_chunks
  order by embedding <=> query_embedding
  limit match_count;
$$;
