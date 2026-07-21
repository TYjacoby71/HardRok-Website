-- Seed data (SPEC.md §6): 5 territories matching the stub states + reps.
-- Rep names/roles were found on public directory listings for HardRok
-- (the live site's contact page blocks automated reading).
-- TODO: replace with the confirmed roster, direct phones, emails, and
-- calendar URLs (TODO.md Part 2D). Phones below intentionally use the main
-- (866) line until direct lines are confirmed.

insert into territories (id, name, states) values
  ('11111111-1111-1111-1111-111111111101', 'Nevada',     '{NV}'),
  ('11111111-1111-1111-1111-111111111102', 'California', '{CA}'),
  ('11111111-1111-1111-1111-111111111103', 'Arizona',    '{AZ}'),
  ('11111111-1111-1111-1111-111111111104', 'Utah',       '{UT}'),
  ('11111111-1111-1111-1111-111111111105', 'Idaho',      '{ID}');

insert into reps (id, name, slug, phone, email, territory_id, active, round_robin_weight) values
  -- TODO: confirm direct phone + email for Eric Dutton (Nevada Territory Manager)
  ('22222222-2222-2222-2222-222222222201', 'Eric Dutton', 'eric-dutton',
   '+18664273765', null, '11111111-1111-1111-1111-111111111101', true, 1),
  -- TODO: confirm direct phone + email for Aaron Washington (California Sales Manager)
  ('22222222-2222-2222-2222-222222222202', 'Aaron Washington', 'aaron-washington',
   '+18664273765', null, '11111111-1111-1111-1111-111111111102', true, 1),
  -- House queue: catches AZ/UT/ID and any lead with no territory match
  -- (SPEC.md §7 step 4).
  ('22222222-2222-2222-2222-222222222299', 'House Queue', 'house',
   '+18664273765', null, null, true, 1),
  -- Extended roster from public directory listings (2026-07). territory_id
  -- intentionally NULL so routing stays NV->Dutton, CA->Washington,
  -- rest->house until the client confirms assignments (TODO.md Part 2D) —
  -- setting territory_id is all it takes to add someone to the round-robin.
  ('22222222-2222-2222-2222-222222222203', 'Jonathan Zebroski', 'jonathan-zebroski', '+18664273765', null, null, true, 1),
  ('22222222-2222-2222-2222-222222222204', 'Edward Pyeatt', 'edward-pyeatt', '+18664273765', null, null, true, 1),
  ('22222222-2222-2222-2222-222222222205', 'Luis Monjaras', 'luis-monjaras', '+18664273765', null, null, true, 1),
  ('22222222-2222-2222-2222-222222222206', 'Jay Hover', 'jay-hover', '+18664273765', null, null, true, 1),
  ('22222222-2222-2222-2222-222222222207', 'Nick Potter', 'nick-potter', '+18664273765', null, null, true, 1),
  ('22222222-2222-2222-2222-222222222208', 'Justin Kroeck', 'justin-kroeck', '+18664273765', null, null, true, 1),
  ('22222222-2222-2222-2222-222222222209', 'Nicki Dunn-Teixeira', 'nicki-dunn-teixeira', '+18664273765', null, null, true, 1);
