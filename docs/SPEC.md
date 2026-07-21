# SPEC.md — HardRok.com Full Rebuild
# Audience: autonomous coding agent (Claude Code). Follow literally. Ask before deviating.

## 0. PROJECT SUMMARY
Rebuild hardrok.com (industrial crusher/conveyor/screening parts distributor, currently on legacy GoDaddy Website Builder 7) as a custom static site with a full lead-capture pipeline. Priorities: SEO page architecture, mobile-first conversion, territory-based lead routing, CRM-agnostic integration.

## 1. STACK
- Framework: Astro 4+, static output, TypeScript strict.
- Content: Astro content collections (markdown + frontmatter) for products, brands, service-areas, industries, team, equipment-for-sale, resources. NO page copy hardcoded in components.
- Hosting: Netlify. Backend: Netlify Functions (TypeScript).
- Database: Supabase (Postgres + Storage). System of record for ALL leads.
- SMS: Twilio. Env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.
- CRM: UNKNOWN (client onboarding new CRM). Build adapter layer per Section 8.
- CSS: Tailwind. All design tokens from Section 2 defined in tailwind.config. No arbitrary values in components.
- Forms: native HTML, progressively enhanced. MUST work with JS disabled (POST to Netlify Function endpoint).
- No client-side JS frameworks except Astro islands where interactivity is required (form validation, calendar embeds, territory map).

## 2. DESIGN SYSTEM — "Industrial Confidence"
Audience: quarry managers, mine maintenance supervisors. Aesthetic target: Caterpillar / Milwaukee Tool. Heavy, competent, fast. Not SaaS-slick.

### 2.1 Color tokens
- --color-ink: #1A1D21 (primary text, dark sections)
- --color-steel: #3D444D (secondary text, borders-on-dark)
- --color-surface: #F5F4F1 (page background, warm off-white)
- --color-white: #FFFFFF (cards)
- --color-safety: #F2A900 (accent: CTAs, active nav. Max ~5% of any viewport)
- --color-safety-hover: #D99700
- --color-rust: #B0492F (urgency badges only, e.g. "In Stock — Ships Today")
- --color-success: #2E7D4F

RULE: never safety-yellow text on white. Yellow is a background for ink text, or a border/underline only.

### 2.2 Typography
- Headings: Barlow Condensed 600–700. H1/H2 uppercase, letter-spacing 0.02em.
- Body/UI: Inter 400/500/600.
- Self-host via @fontsource. font-display: swap.

Scale (use clamp()):
- H1: clamp(2rem, 5vw, 3.25rem), line-height 1.05
- H2: clamp(1.5rem, 3.5vw, 2.25rem), line-height 1.1
- H3: 1.25–1.5rem, weight 600, sentence case
- H4: 1.125rem, weight 600
- Body: 1–1.0625rem, line-height 1.6
- Small/meta: 0.875rem
- Nav links: 0.9375rem, weight 500

RULES: exactly one H1 per page. Never skip heading levels. DOM order must equal visual order.

### 2.3 Layout
- 4px base unit. Section padding 4rem mobile / 6rem desktop.
- Max content width 1200px. Text measure max 70ch. 12-col desktop grid, single column mobile-first.
- Cards: white, 1px rgba(61,68,77,.15) border, 8px radius, shadow on hover only.

### 2.4 Shared components (build first)
Header (sticky, shrink-on-scroll) · MobileNav (fullscreen overlay, thumb-reachable) · Hero · CTAButton (primary: safety bg / ink text; secondary: ink outline) · ProductCard · BrandLogoRow (real img tags + alt text, grayscale-to-color on hover) · LeadForm · StickyMobileCTA (persistent bottom bar: [Call] [Text] [Quote]) · Breadcrumbs · FooterMega · TestimonialBlock · StatBar · TerritoryMap · RepCard · FAQAccordion (emits FAQPage schema)

### 2.5 Imagery
Astro Image component, WebP/AVIF, descriptive filenames, explicit width/height (CLS = 0), alt text mandatory, lazy-load below fold. NO text baked into images.

## 3. GLOBAL PAGE REQUIREMENTS (every page)
- One H1. Unique title tag <= 60 chars, pattern: "{Primary Keyword} | HardRok Equipment".
- Unique meta description <= 155 chars.
- Canonical origin: https://www.hardrok.com — self-referencing canonical tag; 301 http-to-https and non-www-to-www at edge.
- OpenGraph + Twitter cards. Breadcrumbs + BreadcrumbList schema on all pages below top level.
- Header phone visible: (866) 427-3765. StickyMobileCTA on all pages except /lp/*.
- Footer: NAP, hours "Mon–Fri 7am–5pm PST", full HTML sitemap links, territory links.
- Sitewide Organization + LocalBusiness schema.
- Budgets: Lighthouse mobile Performance >= 95, Accessibility >= 95, CLS = 0. WCAG 2.1 AA. All interactive elements keyboard-accessible with visible focus states.

### 3.1 Legacy 301 redirect map (required, exact)
- /home.html -> /
- /crusher-components.html -> /products/crusher-parts/
- /conveyor-components.html -> /products/conveyor-components/
- /pulley-components.html -> /products/conveyor-components/pulleys/
- /rotor-components.html -> /products/rotor-components/
- /wire-screening-media.html -> /products/screening-media/
- /crushers2.html -> /equipment-for-sale/
- /battleborn--wear-products.html -> /products/battleborn-wear-products/
- /contact.html -> /contact/
- /request-a-quote.html -> /quote/
- /automation.html -> /products/

## 4. SITEMAP (build every URL; all linked in nav/footer; NO orphan pages)
```
/                               Home
/products/                      Products hub
  /products/crusher-parts/
    jaw-crusher-parts/
    cone-crusher-parts/
    impact-crusher-parts/       (VSI & HSI: rotors, shoes, anvils, blow bars)
    manganese-wear-parts/
    crusher-hydraulics/
  /products/conveyor-components/
    idlers-and-rollers/
    pulleys/                    (head, tail — merges old Pulley Components page)
    belting-and-belt-cleaners/
    self-adjusting-motor-bases/
  /products/screening-media/
    woven-wire-screen-cloth/
    urethane-screen-media/
    screen-parts-and-components/
  /products/rotor-components/
  /products/battleborn-wear-products/   (proprietary line — flagship styling)
/brands/                        Brands hub ("Replacement parts to fit:")
  symons/  metso-nordberg-hp/  metso-mp/  sandvik-hydrocone/
  svedala-superior/  omnicone/  telsmith/  cedarapids/  allis-chalmers/
  cms-cepcor/                   (authorized dealer page)
/equipment-for-sale/            (collection-driven inventory)
/service-areas/                 (hub with TerritoryMap)
  nevada/  california/  arizona/  utah/  idaho/    (stub these 5; more later)
/industries/
  aggregate/  hard-rock-mining/  gold-mining/  sand-and-gravel/  recycling/
/team/                          (hub)
  /team/{rep-slug}/             (collection-driven; seed 2 placeholder reps)
/quote/                         (primary conversion page)
/contact/
/about/
/resources/                     (stub with 3 placeholder article slots)
/lp/downtime-emergency/
/lp/symons-parts/
/lp/screen-media-quote/
/sitemap.xml  /robots.txt  /sitemap/ (HTML sitemap page)
```
RULE: adding a markdown file to any collection must produce a complete, indexed page with zero code changes.

## 5. PAGE SPECS

### 5.1 Home /
H1: "Crusher Parts, Conveyor Components & Screening Media — Shipped Fast."
Section order: Hero (equipment photo, subhead re: 40+ years + stocked warehouse, dual CTA Quote/Call) -> StatBar -> 3 category cards -> BrandLogoRow -> Battleborn feature band -> "Why HardRok" (rewrite uptime/inventory/expertise copy as real HTML text) -> Territory teaser + map -> Testimonial -> CTA band with text-to-quote number -> FAQAccordion (4 questions).

### 5.2 Product hub (template)
H1 = category keyword. 300+ word genuinely useful intro (failure modes, spec guidance, lead times). Child-page card grid. Compatible-brands row linking to /brands/. Inline short LeadForm (name/phone/part). FAQ block.

### 5.3 Product detail (template)
H1 = exact part keyword (e.g. "Cone Crusher Mantles & Bowl Liners"). Sections: overview 150–300 words · compatible-machines table (crawlable HTML table) · materials/manganese grades explained · "OEM vs premium aftermarket" honesty section · trademark disclaimer VERBATIM from current site · inline LeadForm prefilled with part_category · related parts · Product + FAQPage schema.

### 5.4 Brand page (template)
H1: "Replacement Parts to Fit {Brand} Crushers." Wording must use "to fit" / "aftermarket" throughout (legal). Model list, available part types linking to product pages, CTA, disclaimer.

### 5.5 Service-area page (template)
H1: "Crusher & Conveyor Parts in {State}." TerritoryMap with state highlighted, assigned RepCard (photo, direct phone, calendar link), regional shipping/delivery notes, local industries served, LeadForm pre-tagged with territory. areaServed schema.

### 5.6 Team page (template)
H1 = rep name + title. Photo, territory served, direct phone/SMS, email, embedded booking calendar iframe if reps.calendar_url is set (else call/text CTA), short bio, "parts I quote most" links. Person schema.

### 5.7 Quote page /quote/
REQUIRED fields: Name · Phone · State (select; drives routing) · Category (Crusher Parts | Conveyor | Screening | Equipment | Other) · Message.
OPTIONAL fields: Email · Company · Machine make/model · File upload (worn-part photo -> Supabase Storage).
FORBIDDEN fields: address, city, zip, fax.
Response promise copy: "A HardRok rep will call you within 2 business hours, Mon–Fri 7–5 PST."
Below form: text-to-quote block ("Prefer to text? Send a photo of your part to {TWILIO_FROM_NUMBER}") + click-to-call.

### 5.8 Landing pages /lp/*
Logo + phone only (no nav). Message-match headline, form above the fold, social proof. /lp/symons-parts/ is indexable; the other two are noindex.

## 6. DATABASE (Supabase)
```sql
create table territories (
  id uuid primary key default gen_random_uuid(),
  name text, states text[], geojson jsonb );

create table reps (
  id uuid primary key default gen_random_uuid(),
  name text, slug text, phone text, email text,
  territory_id uuid references territories(id),
  calendar_url text, active boolean default true,
  round_robin_weight int default 1, last_assigned_at timestamptz );

create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  source text not null,        -- quote_form | product_form | sms | landing_page
  source_page text,
  name text, phone text not null, email text, company text,
  state text, category text, machine text, message text,
  attachment_url text,
  territory_id uuid references territories(id),
  assigned_rep_id uuid references reps(id),
  crm_status text default 'pending',   -- pending | synced | failed
  crm_external_id text, raw jsonb );
```
Seed: 2 placeholder reps, 5 territories matching the stub states.

## 7. LEAD ROUTING — Netlify Function assign-lead
1. Match lead.state to territories.states.
2. If territory.geojson is present AND geo data is available (SMS area-code state lookup or IP geo), point-in-polygon overrides state match.
3. One active rep in territory -> assign. Multiple -> round-robin ordered by last_assigned_at, weighted by round_robin_weight.
4. No match -> assign house queue (rep slug "house"), flag raw.review = true.
Log every assignment decision into leads.raw.

## 8. CRM ADAPTER LAYER (vendor unknown — do not hardcode any vendor)
functions/lib/crm/ exposing interface:
- createLead(lead) -> { externalId }
- assignOwner(externalId, repMap)
- addNote(externalId, note)

Adapters selected by env CRM_PROVIDER: hubspot.ts (stub) · zoho.ts (stub) · pipedrive.ts (stub) · webhook.ts (COMPLETE: POST normalized lead JSON to env CRM_WEBHOOK_URL). Default = webhook.

Pipeline: form/SMS -> Supabase insert (never lose a lead) -> assign-lead -> CRM adapter -> on throw: crm_status = 'failed', retry via Netlify scheduled function (every 15 min), alert SMS to env ADMIN_PHONE.

## 9. TWILIO FLOWS (Netlify Functions)
### 9.1 Inbound SMS webhook
Create lead source='sms', save MMS media to Supabase Storage, auto-reply: "Thanks — you've reached HardRok Equipment. A parts specialist will text you back shortly. Reply with a photo of the part + your machine model to speed things up." Route by area-code-to-state lookup. Forward summary SMS to assigned rep.

### 9.2 Web-lead alert
Every lead fires an SMS to the assigned rep: name, phone, category, state, message (truncated to 120 chars), record link.

### 9.3 Missed-call text-back
Build as a stubbed/disabled function (866 line not yet fronted by Twilio).

## 10. ACCEPTANCE RUBRIC (verify ALL before reporting done)
- [ ] All Section 3.1 redirects return 301 to exact targets; single canonical origin enforced.
- [ ] Lighthouse mobile: Perf >= 95, A11y >= 95, CLS = 0 on /, /quote/, and one product page.
- [ ] All forms submit successfully with JS disabled.
- [ ] Every page: one H1, ordered headings, unique title/description, canonical, breadcrumbs + schema where applicable.
- [ ] Lead persists to Supabase even when the CRM adapter throws.
- [ ] Inbound SMS (test creds) creates a lead and sends the auto-reply.
- [ ] Round-robin verified with 2 reps in one territory (alternates correctly).
- [ ] Zero images containing text; 100% alt-text coverage.
- [ ] sitemap.xml auto-generated; robots.txt references it; /sitemap/ HTML page exists.
- [ ] StickyMobileCTA present on all pages except /lp/*.
- [ ] A new markdown file in content/service-areas/ produces a complete page with no code edits.

## 11. OPEN INPUTS (use placeholders; flag TODO comments in code)
- Real territory list + rep roster (TODO: seed data)
- CRM vendor name (TODO: finish the matching adapter)
- Final SLA copy approval ("2 business hours")
- Photography (use grayscale placeholders sized to spec)
