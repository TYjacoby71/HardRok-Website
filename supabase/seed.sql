-- Seed data (SPEC.md §6): 5 territories + confirmed rep roster.
-- Roster, direct phones, and emails confirmed from hardrok.com/contact.html
-- (site crawl, 2026-07-23). Matches the live database.

insert into territories (id, name, states) values
  ('11111111-1111-1111-1111-111111111101', 'Nevada',     '{NV}'),
  ('11111111-1111-1111-1111-111111111102', 'California', '{CA}'),
  ('11111111-1111-1111-1111-111111111103', 'Arizona',    '{AZ}'),
  ('11111111-1111-1111-1111-111111111104', 'Utah',       '{UT}'),
  ('11111111-1111-1111-1111-111111111105', 'Idaho',      '{ID}');

insert into reps (id, name, slug, phone, email, territory_id, active, round_robin_weight) values
  -- Nevada: Eric (statewide) + Aaron (Western NV) round-robin
  ('22222222-2222-2222-2222-222222222201', 'Eric Dutton', 'eric-dutton',
   '+17758423111', 'eric@hardrok.com', '11111111-1111-1111-1111-111111111101', true, 1),
  ('22222222-2222-2222-2222-222222222202', 'Aaron Washington', 'aaron-washington',
   '+12093290616', 'aaron.w@hardrok.com', '11111111-1111-1111-1111-111111111101', true, 1),
  -- California: Luis (Northern), Steve (Central), JT (Southern) round-robin
  ('22222222-2222-2222-2222-222222222205', 'Luis Monjaras', 'luis-monjaras',
   '+12093291030', 'luis.m@hardrok.com', '11111111-1111-1111-1111-111111111102', true, 1),
  ('22222222-2222-2222-2222-222222222210', 'Steve Buchanan', 'steve-buchanan',
   '+12097446268', 'steve.b@hardrok.com', '11111111-1111-1111-1111-111111111102', true, 1),
  ('22222222-2222-2222-2222-222222222211', 'JT Triplett', 'jt-triplett',
   '+19512987377', 'jtriplett@hardrok.com', '11111111-1111-1111-1111-111111111102', true, 1),
  -- House queue: catches AZ/UT/ID and any lead with no territory match
  -- (SPEC.md §7 step 4).
  ('22222222-2222-2222-2222-222222222299', 'House Queue', 'house',
   '+18664273765', null, null, true, 1);
