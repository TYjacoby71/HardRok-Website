# HardRok.com

Rebuild of hardrok.com — Astro 4 static site on Netlify with a Supabase-backed
lead pipeline, territory routing, CRM-agnostic adapter layer, and Twilio SMS
flows. Build contract: `docs/SPEC.md` · per-page content: `docs/CONTENT.md` ·
open items: `docs/TODO.md` · agent rules: `CLAUDE.md`.

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Production build to `dist/` |
| `npm run check` | Type-check (`astro check`) |

## Environment variables

Copy `.env.example` to `.env` locally; set the same in the Netlify UI for
deploys.

- `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (`sb_secret_…` from Project Settings →
  API Keys; legacy `SUPABASE_SERVICE_ROLE_KEY` also accepted) — lead system of
  record
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` — SMS flows
- `CRM_ENABLED` — master delivery switch. `false` (launch default) emails each
  lead to `LEAD_EMAIL_TO` (`crm_status='email_sent'`), like the old GoDaddy
  form; `true` runs the CRM adapter. Supabase insert and rep SMS alerts happen
  in both modes.
- `LEAD_EMAIL_TO`, `LEAD_EMAIL_FROM`, `EMAIL_PROVIDER`
  (`resend` default | `sendgrid` | `smtp` stub), `RESEND_API_KEY` /
  `SENDGRID_API_KEY` — email mode (`netlify/functions/lib/email/`)
- `CRM_PROVIDER` (`webhook` default | `hubspot` | `zoho` | `pipedrive`),
  `CRM_WEBHOOK_URL` — CRM adapter layer (`netlify/functions/lib/crm/`)
- `ADMIN_PHONE` — SMS alert target when a CRM sync fails
- `PUBLIC_SITE_URL` — canonical origin
- `PUBLIC_TEXT_QUOTE_NUMBER` — published text-to-quote number (optional until
  the Twilio number is confirmed; UI renders a TODO placeholder without it)

## One-time setup

1. **Supabase**: run `supabase/migrations/0001_init.sql`, then
   `supabase/seed.sql` (2 reps + house queue + 5 territories).
2. **Netlify**: connect the repo — `netlify.toml` carries build, functions,
   the §3.1 legacy 301 map, and canonical-origin redirects. Add both
   `hardrok.com` and `www.hardrok.com` domains (www is primary).
3. **Twilio**: point the number's "a message comes in" webhook at
   `/.netlify/functions/sms-inbound` (POST). Missed-call text-back is stubbed
   in `missed-call-textback.ts` until the 866 line fronts through Twilio.
4. **Email mode (launch default)**: set `LEAD_EMAIL_TO` (receiving inbox) and
   `LEAD_EMAIL_FROM` (verified sender on a domain HardRok controls), plus
   `RESEND_API_KEY` (or switch `EMAIL_PROVIDER=sendgrid` with
   `SENDGRID_API_KEY`). Leads land in the inbox exactly like the old site —
   plus the Supabase record and rep SMS the old site never had.
5. **CRM cutover (later, no code change)**: set `CRM_PROVIDER`/vendor env vars
   and flip `CRM_ENABLED=true`. Failed deliveries in either mode retry every
   15 min (`crm-retry.ts`) and alert `ADMIN_PHONE`; leads always persist in
   Supabase first.

## Content editing — no code required

Every page's copy lives in `src/content/`. Adding a markdown file to any
collection (products, brands, service-areas, industries, team,
equipment-for-sale, resources) publishes a complete, indexed page — nav,
footer, HTML sitemap, and sitemap.xml update automatically. Set
`draft: true` in frontmatter to hold a page back (see
`products/crusher-parts/grinder-parts.md` and the equipment template entry).

Unconfirmed facts render as visible `[TODO: …]` badges sourced from
`docs/TODO.md` Part 2 — replace the data, never invent it.
