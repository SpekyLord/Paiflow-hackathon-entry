-- CYFER for SMEs: 010 explicit grants for service_role
-- On a project created with "Automatically expose new tables" OFF, new tables get no default privileges, so the server's
-- service_role client was denied direct table reads (guards, session loading, attempt reads) and provisioning writes.
-- Least privilege: read everywhere; write only where server code or provisioning writes a table directly.
-- Everything else is written through SECURITY DEFINER RPCs (which run as the table owner). anon/authenticated get nothing here.

grant usage on schema public to service_role;
grant select on all tables in schema public to service_role;
grant insert, update on public.profiles, public.organisations, public.org_memberships to service_role;

-- Tables created by later migrations (010+ SHOULD tier) are readable by the server by default.
alter default privileges in schema public grant select on tables to service_role;
