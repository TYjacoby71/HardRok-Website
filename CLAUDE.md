# AGENT-INSTRUCTIONS.md — HardRok.com Build
# Persistent project instructions for the coding agent.
# If using Claude Code, also save a copy as CLAUDE.md in the repo root (auto-loaded).
# Read this fully before writing any code. Re-read Section 5 before reporting done.

## 1. WHAT YOU ARE BUILDING
A complete rebuild of hardrok.com — an industrial crusher/conveyor/screening parts
distributor currently stuck on a dead GoDaddy Website Builder 7 site. You are
producing a fast, mobile-first, SEO-structured static site with a full lead-capture
and territory-routing pipeline.

## 2. YOUR SOURCE FILES (read in this order)
1. SPEC.md      — THE build contract. Structure, stack, design system, DB schema,
                  lead routing, Twilio flows, and the Section 10 acceptance rubric.
                  This governs HOW everything is built. When in doubt, SPEC.md wins.
2. CONTENT.md   — Per-page content: keyword, H1, title tag, meta description, and
                  body copy for all 40+ pages. This governs WHAT goes on each page.
3. TODO.md      — Confirmed facts vs. open items. Anything in TODO Part 2 is
                  unconfirmed — treat as a visible placeholder, never invent a value.

## 3. HARD RULES (do not violate)
- Follow SPEC.md literally. If something is ambiguous or two files conflict, STOP and
  ask — do not guess and do not silently deviate.
- Do NOT invent facts. Model numbers, stats, locations, grades, rep names, SLAs, and
  Battleborn details are UNCONFIRMED (see TODO.md). Where a real value is missing,
  render a visible placeholder in the UI (e.g. a "[TODO: confirm]" badge) AND leave a
  `// TODO:` code comment. Never fabricate a plausible-looking number.
- Aftermarket legal wording is mandatory on every product and brand page: use
  "to fit", "replacement for", "aftermarket". Never imply parts are OEM. Include the
  trademark disclaimer (in CONTENT.md header) on every product/brand page verbatim.
  EXCEPTION: the CMS Cepcor page is an authorized-dealer page — see CONTENT.md.
- Content is data, not code. Products, brands, service-areas, industries, team, and
  equipment are Astro content collections (markdown + frontmatter). Adding a new
  markdown file must produce a complete, indexed page with ZERO code changes.
- Never lose a lead. Every form/SMS submission writes to Supabase BEFORE any CRM call.
  If the CRM adapter throws, the lead still persists and is queued for retry.
- The CRM vendor is unknown. Build the adapter layer (SPEC.md §8) with the generic
  webhook adapter as the working default. Do not hardcode any CRM vendor.
- No browser storage APIs (localStorage/sessionStorage). Not needed here anyway.
- Accessibility and performance are acceptance criteria, not nice-to-haves. See §5.

## 4. BUILD ORDER (recommended)
1. Scaffold: Astro + TypeScript + Tailwind. Put ALL design tokens from SPEC.md §2 into
   tailwind.config. Wire self-hosted fonts (Barlow Condensed, Inter).
2. Shared component library (SPEC.md §2.4) — build these before pages.
3. Base layout: global head (title/meta/canonical/OG/schema), Header, FooterMega,
   StickyMobileCTA, Breadcrumbs. Enforce the global requirements in SPEC.md §3.
4. Content collections + schemas for every content type.
5. Page templates (SPEC.md §5), then generate all leaf pages from CONTENT.md.
6. Supabase schema (SPEC.md §6) + seed data (2 reps, 5 territories).
7. Netlify Functions: form handler → Supabase insert → assign-lead (§7) → CRM
   adapter (§8). Then Twilio flows (§9).
8. Redirects (SPEC.md §3.1), sitemap.xml, robots.txt, HTML /sitemap/.
9. Run the acceptance rubric. Fix until all boxes pass.

## 5. DEFINITION OF DONE
You are NOT done until every box in SPEC.md §10 passes. Before reporting completion,
explicitly walk the rubric and state pass/fail for each item. Specifically verify:
- All §3.1 redirects return 301 to exact targets; single canonical origin enforced.
- Lighthouse mobile ≥95 performance, ≥95 accessibility, CLS = 0 on home, /quote/, and
  one product page.
- Every form submits successfully with JavaScript disabled.
- A lead persists to Supabase even when the CRM adapter throws.
- Inbound SMS (test creds) creates a lead and sends the auto-reply.
- Round-robin alternates correctly with 2 reps in one territory.
- Zero images contain text; 100% alt-text coverage.
- Adding a markdown file to content/service-areas/ yields a complete page, no code edits.

## 6. WHEN YOU FINISH
Report as:
1. Rubric walkthrough (each §10 item: pass/fail + note).
2. A list of every placeholder/TODO you rendered, grouped by the TODO.md category, so
   the client knows exactly what to supply to go live.
3. Env vars required (Supabase, Twilio, CRM_PROVIDER/CRM_WEBHOOK_URL, ADMIN_PHONE),
   with a .env.example committed.
4. Any point where you were tempted to deviate from SPEC.md and what you did instead.

## 7. IF YOU GET STUCK
Ask a specific question rather than guessing. Good: "SPEC.md §5.5 wants an assigned rep
on each service-area page, but TODO.md says the roster is unconfirmed — render the
RepCard as a placeholder, or hide it until seeded?" Bad: silently picking one.
