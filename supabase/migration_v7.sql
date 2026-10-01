-- MIGRATION v7 — lets each guest kit store the extra details the
-- Lenny-format Show Notes need (guest LinkedIn, Spotify/Apple links,
-- related episode, etc.), and tracks when a kit was last edited.
-- Resource links themselves are stored inside the existing "resources"
-- jsonb column as { label, type, url }.

alter table guest_kits add column if not exists extras jsonb not null default '{}'::jsonb;
alter table guest_kits add column if not exists updated_at timestamptz not null default now();
