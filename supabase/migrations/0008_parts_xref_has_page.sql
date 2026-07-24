-- Uniform-coverage bookkeeping: every row knows whether its number has a
-- published page. has_page is generated from page_url so the two can never
-- disagree; page_url follows the site's slug rule
-- ('/parts/' || slugify(brand-part_number) || '/') for all rows except
-- brand='unknown' (the only numbers without pages).
alter table parts_xref
  add column if not exists has_page boolean generated always as (page_url is not null) stored;
create index if not exists parts_xref_has_page_idx on parts_xref (has_page);
