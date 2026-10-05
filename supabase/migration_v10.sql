-- MIGRATION v10 — human approval before guests/creators see a kit
-- (decision 0009, knowledge/standards/review-standard.md).
-- Every kit starts as 'draft'; its public link shows "being prepared"
-- until someone marks it 'approved'. Existing kits are reset to draft
-- for re-review (owner's choice, Oct 2026).

alter table guest_kits add column if not exists reviewed_by text;
alter table guest_kits add column if not exists reviewed_at timestamptz;
update guest_kits set status = 'draft', reviewed_by = null, reviewed_at = null;

alter table creator_kits add column if not exists status text not null default 'draft';
alter table creator_kits add column if not exists reviewed_by text;
alter table creator_kits add column if not exists reviewed_at timestamptz;
update creator_kits set status = 'draft', reviewed_by = null, reviewed_at = null;
