-- MIGRATION v6 — adds a "resources" field to guest_kits, capturing named
-- people/companies/books/tools mentioned in the transcript that likely need
-- a link. The AI identifies WHAT to link; a human corrects the actual URL.

alter table guest_kits add column if not exists resources jsonb;
