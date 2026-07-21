-- HardRok lead pipeline schema (SPEC.md §6). Supabase is the system of
-- record for ALL leads: every form/SMS submission inserts here BEFORE any
-- CRM call.

create table territories (
  id uuid primary key default gen_random_uuid(),
  name text,
  states text[],
  geojson jsonb
);

create table reps (
  id uuid primary key default gen_random_uuid(),
  name text,
  slug text,
  phone text,
  email text,
  territory_id uuid references territories(id),
  calendar_url text,
  active boolean default true,
  round_robin_weight int default 1,
  last_assigned_at timestamptz
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  source text not null,        -- quote_form | product_form | sms | landing_page
  source_page text,
  name text,
  phone text not null,
  email text,
  company text,
  state text,
  category text,
  machine text,
  message text,
  attachment_url text,
  territory_id uuid references territories(id),
  assigned_rep_id uuid references reps(id),
  crm_status text default 'pending',   -- pending | synced | email_sent | failed
  crm_external_id text,
  raw jsonb
);

-- Service role (Netlify Functions) bypasses RLS; enabling RLS with no public
-- policies keeps anon/authenticated clients out entirely.
alter table territories enable row level security;
alter table reps enable row level security;
alter table leads enable row level security;

create index leads_crm_status_idx on leads (crm_status) where crm_status = 'failed';
create index reps_territory_idx on reps (territory_id) where active;
