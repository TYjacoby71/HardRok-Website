-- Private parts cross-reference layer. Holds the full normalized catalog
-- lead dataset (~35.6k rows from the 2026-07-23 catalog hunt + enrichment +
-- cross-ref sweep). This is DORMANT DATA by design: no pipeline reads it
-- yet. Future use (deliberately not built yet, per client): match inbound
-- quote part numbers, cross-reference against HardRok's own parts list,
-- and promote verified rows to published pages.
-- Only ~500 QA-passed official-source rows have public pages; the rest is
-- internal-only lead data and must never be exposed through the API.

create table parts_xref (
  id bigint generated always as identity primary key,
  part_number text not null,
  brand text,
  model_family text,
  equipment_type text,
  part_category text,
  description text,
  weight text,
  source_domain text,
  source_type text,
  source_url text,
  trust_tier text,        -- A official | B official cross-ref | C third-party | D number-only
  confidence text,        -- high | medium | review
  crossref_group text,    -- exact/inferred group id from the sweep
  overlap_sources int,    -- number of independent sources with this exact PN
  build_priority text,    -- P1..P4 page-build queue rank
  page_url text,          -- set for the ~500 rows with published /parts/ pages
  extra jsonb,            -- all remaining CSV columns, verbatim
  verified boolean not null default false, -- future promotion flag (loop not built)
  loaded_at timestamptz not null default now()
);

create index parts_xref_pn_idx on parts_xref (part_number);
create index parts_xref_brand_idx on parts_xref (brand);
create index parts_xref_group_idx on parts_xref (crossref_group);
create index parts_xref_tier_idx on parts_xref (trust_tier);

-- Cross-reference groups from the sweep (alternate-number clusters).
create table parts_xref_groups (
  id bigint generated always as identity primary key,
  group_id text not null,
  group_kind text,        -- exact_overlap | inferred | explicit
  part_number text not null,
  brand text,
  extra jsonb,
  loaded_at timestamptz not null default now()
);

create index parts_xref_groups_gid_idx on parts_xref_groups (group_id);
create index parts_xref_groups_pn_idx on parts_xref_groups (part_number);

-- Internal-only: RLS on, and NO policies — anon/authenticated cannot read.
-- Netlify functions use the service key and bypass RLS when this data is
-- eventually wired in.
alter table parts_xref enable row level security;
alter table parts_xref_groups enable row level security;
