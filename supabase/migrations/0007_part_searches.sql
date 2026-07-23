-- Part-number search log: one row per search from the site's master
-- part-number search bar (part-search function). Internal-only demand
-- data — which numbers people actually hunt, and which found no page.
create table part_searches (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  query text,          -- raw input, capped at 80 chars by the function
  normalized text,     -- uppercase alphanumeric form used for matching
  matched_url text     -- destination page, null = no match (lead for research)
);
create index part_searches_created_idx on part_searches (created_at);
create index part_searches_norm_idx on part_searches (normalized);

-- Internal-only: RLS on, no policies (service key bypasses).
alter table part_searches enable row level security;
