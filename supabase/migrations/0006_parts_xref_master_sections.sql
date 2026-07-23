-- The client's evolving master CSV (HARDROK_PARTS_MASTER_EVOLVING.csv)
-- organizes the same rows into named sections with a sort key. Mirror those
-- columns so the DB can stay a faithful twin of the etched file; they are
-- backfilled when the master's section map is delivered (the 102 MB master
-- itself exceeds the Drive transport cap).
alter table parts_xref add column if not exists master_section text;
alter table parts_xref add column if not exists master_sort_key text;
create index if not exists parts_xref_section_idx on parts_xref (master_section);
