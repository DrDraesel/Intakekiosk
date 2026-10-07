begin;

-- Public setup marker: contains no patient data. The kiosk can only read it.
create table public.imw_kiosk_connection (
  id integer primary key check (id = 1),
  schema_version integer not null check (schema_version = 1)
);
alter table public.imw_kiosk_connection enable row level security;
revoke all on public.imw_kiosk_connection from public, anon, authenticated;
grant select on public.imw_kiosk_connection to anon, authenticated;
create policy connection_marker_read on public.imw_kiosk_connection
  for select to anon, authenticated using (id = 1);
insert into public.imw_kiosk_connection values (1, 1);

-- Private foundation. No public/authenticated access and no browser write path.
-- Never add this schema to the Data API's exposed schemas.
create schema imw_private;
revoke all on schema imw_private from public, anon, authenticated;
create table imw_private.intake_records (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  created_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed')),
  answers jsonb not null default '{}'::jsonb,
  transcript jsonb not null default '[]'::jsonb,
  review jsonb not null default '{}'::jsonb
);
alter table imw_private.intake_records enable row level security;
revoke all on imw_private.intake_records from public, anon, authenticated;
-- No policies or privileged grants until authenticated clinic access is implemented.

commit;
