-- Run AFTER supabase/migrations/001_initial_schema.sql on the NEW dedicated project only (cyfai-sme-dev).
-- The inherited government tables are not used by the SME build. Lock them to the service role so the
-- permissive inherited policies (supabase/policies/*) are never needed and never applied.
-- Do NOT run supabase/policies/* or supabase/seeds/* on this project.
alter table public.users        enable row level security;
alter table public.documents    enable row level security;
alter table public.blockchain   enable row level security;
alter table public.approvals    enable row level security;
alter table public.transactions enable row level security;
alter table public.budget_data  enable row level security;
revoke all on public.users, public.documents, public.blockchain, public.approvals,
              public.transactions, public.budget_data from anon, authenticated;
