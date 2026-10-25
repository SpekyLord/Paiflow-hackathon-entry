-- CYFER for SMEs: 006 SME documents (tamper-check records) and the private storage bucket
-- DRAFT (F-08c). NOT APPLIED. Writes are server-only. The bucket has NO object policies: the server uses the
-- service role and short-lived signed URLs. Storage keys look like orgs/{orgId}/docs/{uuid} (no user filename).

create table public.org_documents (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organisations(id),
  kind              text not null check (kind in ('contract','invoice','receipt','plan_attachment','other')),
  sha256            text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes        bigint not null check (size_bytes >= 0 and size_bytes <= 10485760),
  media_type        text not null,
  storage_key       text not null unique check (storage_key ~ '^orgs/[0-9a-f-]{36}/docs/[0-9a-f-]{36}$'),
  original_filename text not null check (length(original_filename) <= 255),
  uploaded_by       uuid not null references auth.users(id),
  ledger_block_id   int,
  created_at        timestamptz not null default now()
);
create index org_documents_org_idx on public.org_documents(org_id, created_at desc);

alter table public.org_documents enable row level security;
revoke all on public.org_documents from anon, authenticated;
grant select on public.org_documents to authenticated;

create policy org_documents_select_member on public.org_documents for select to authenticated
  using ((select private.is_org_member(org_id)));

-- Private bucket; upsert forces public = false even if it already existed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sme-files', 'sme-files', false, 10485760, array[
  'application/pdf','image/png','image/jpeg','application/zip','text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
