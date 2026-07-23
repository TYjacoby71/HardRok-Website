-- Lead -> sale close-out tracking. Filled during monthly reconciliation
-- (matching closed deals back to their originating web/SMS lead by
-- normalized phone/email).
alter table leads
  add column closed_at timestamptz,
  add column closed_value numeric(12,2),
  add column closed_ref text;  -- invoice / PO number

-- Reporting: monthly lead -> sale conversions by source.
create view lead_conversions_monthly as
select
  date_trunc('month', closed_at)::date as month,
  source,
  count(*)          as closed_leads,
  sum(closed_value) as closed_revenue
from leads
where closed_at is not null and closed_value is not null
group by 1, 2
order by 1 desc, 2;

-- Open pipeline: leads awaiting reconciliation, newest first.
create view leads_open as
select id, created_at, source, source_page, name, phone, state, category
from leads
where closed_at is null
order by created_at desc;
