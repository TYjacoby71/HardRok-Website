# TODO.md — HardRok.com Build: Confirmed Facts + Open Items
# Companion to SPEC.md and CONTENT.md.
# PART 1 = everything HardRok's live site already states (verified, safe to use).
# PART 2 = everything that must be confirmed with the client before final copy/build.
#
# CRITICAL NOTE: HardRok's current site lists brands and part types but does NOT
# publish a single specific model number anywhere. Every model number in CONTENT.md
# (HP100–500, Symons 2ft–7ft, Omnicone 937–1560, etc.) is industry knowledge used as
# a placeholder — NOT sourced from HardRok. All of it is flagged in PART 2.

===============================================================================
## PART 1 — CONFIRMED FROM HARDROK'S EXISTING SITE (verified)
===============================================================================

### Brands HardRok names
- Nordberg / Metso: HP, MP, Symons, Omnicone
- Sandvik / Svedala: Hydrocone, Superior GP
  (NOTE: their site says "Superior GP" — update the Svedala/Superior brand page wording.)
- Telsmith
- Cedarapids
- Allis-Chalmers
- Authorized CMS Cepcor dealer

### Part types HardRok names
Jaw crushers:      jaw plates, toggles, cheek plates
Cone crushers:     mantles, bowl liners, concave rings
Impactors (VSI/HSI): rotors, shoes, anvils, blow bars, liner plates
Grinders:          heavy-duty wear tips and hammers
                   (NOTE: not yet a page in SPEC/CONTENT — see PART 2 structural gaps)
Manganese:         "various grades" (specific grades NOT stated)
Crusher hydraulics: full hydraulic support and components, all major brands
Self-adjusting motor bases: automatically maintain drive-belt tension

### Conveyor items HardRok names (home page)
Conveyors, head pulley, tail pulley, idlers, belting, belt cleaners

### Screening items HardRok names (home page)
Screen media, screening parts, screen components, woven wire, screen cloth

### Company facts confirmed on site
- Phone: (866) 427-3765
- Hours: Mon–Fri 7 a.m.–5 p.m. PST
- Claims "over 40 years" of specialized experience
- Current response promise on live form: 48–72 hours (REPLACE — see CONTENT.md quote page)
- Copyright shows 2023

===============================================================================
## PART 2 — OPEN ITEMS TO CONFIRM WITH CLIENT
===============================================================================

### A. Structural decisions (resolve before build)
- [ ] Grinder parts: HardRok sells grinder wear tips + hammers but there is no page.
      Recommend adding /products/crusher-parts/grinder-parts/. Approve? (SPEC + CONTENT
      both need the new page if yes.)
- [ ] Svedala brand page: confirm "Superior GP" naming (not just "Superior").

### B. Compatible-machine model lists (one table per page — all UNCONFIRMED)
# Placeholders below are industry-standard guesses. Client must confirm which
# models HardRok actually supplies before these tables ship.
- [ ] Symons — proposed: 2ft, 3ft, 4¼ft, 5½ft, 7ft (standard + shorthead)
- [ ] Metso/Nordberg HP — proposed: HP100, HP200, HP300, HP400, HP500 (+ HP4/HP5?)
- [ ] Metso MP — proposed: MP800, MP1000 (others?)
- [ ] Sandvik Hydrocone — proposed: H2800, H3800, H4800, H6800 (CH/CS series?)
- [ ] Svedala / Superior GP — actual models UNKNOWN
- [ ] Omnicone — proposed: 937, 1144, 1352, 1560
- [ ] Telsmith — cone + jaw models UNKNOWN
- [ ] Cedarapids — jaw + cone models UNKNOWN
- [ ] Allis-Chalmers — gyratory + cone models UNKNOWN
- [ ] Jaw / cone / impact product-detail pages — which brand+model rows to populate

### C. Business facts (fills TODO markers in CONTENT.md)
- [ ] StatBar numbers: years in business, SKUs stocked, average ship time
- [ ] Founding year
- [ ] HQ + warehouse location(s) — needed for LocalBusiness schema + service-area pages
- [ ] Team size
- [ ] Battleborn™: scope, materials, warranty, differentiation (flagship page — needs real detail)
- [ ] CMS Cepcor: exact authorized-dealer wording client is comfortable claiming
- [ ] Manganese grades actually offered (CONTENT.md drafts 14% / 18% / 22% — confirm)
- [ ] Response-time SLA sign-off (CONTENT.md uses "2 business hours")

### D. People + lead routing (for Supabase seed + team pages)
- [ ] Real rep roster: names, direct phones, emails, photos
- [ ] Territory-to-rep assignment
- [ ] Full territory list (SPEC stubs NV/CA/AZ/UT/ID — confirm the real footprint)
- [ ] Each rep's booking calendar URL (Calendly or CRM-native)

### E. Integrations
- [ ] CRM vendor name (to finish the matching adapter; webhook adapter works meanwhile)
- [ ] Can the (866) line front through Twilio? (enables missed-call text-back flow)
- [ ] Twilio number to publish as the text-to-quote number

### F. Assets
- [ ] Real equipment / warehouse / wear-part photography (grayscale placeholders until then)
- [ ] Brand logos for BrandLogoRow (with permission/fair-use review)
- [ ] Rep headshots

===============================================================================
## HANDOFF SUMMARY
===============================================================================
Files in this build set:
- SPEC.md         — structure, stack, design system, routing, acceptance rubric
- CONTENT.md      — per-page keyword, H1, title, meta, body copy (40+ pages)
- TODO.md         — this file: confirmed facts + open items
- PITCH.md        — sales document for HardRok leadership (human-facing)
- GROWTH-PLAN.md  — national-growth strategy memo (human-facing)

For the coding agent: hand over SPEC.md + CONTENT.md together. Instruction:
"Build per SPEC.md; pull page content from CONTENT.md; leave all TODO items as
visible placeholders in the UI and as code comments. Work the SPEC.md Section 10
acceptance rubric before reporting done."

Everything in PART 2 can be filled in without touching structure — the site is
built to scaffold complete and have facts dropped into markdown/seed data after.
