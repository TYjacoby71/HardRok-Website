import { defineCollection, z } from 'astro:content';

// Content is data, not code (AGENT-INSTRUCTIONS §3). Every page's copy lives in
// markdown; adding a file to any collection yields a complete indexed page with
// zero code changes.

const faq = z.object({ q: z.string(), a: z.string() });

const products = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(), // H1
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(155),
    keyword: z.string(),
    kind: z.enum(['hub', 'detail']),
    order: z.number().default(99),
    flagship: z.boolean().default(false),
    draft: z.boolean().default(false),
    prefillCategory: z.string().default('Crusher Parts'),
    compatibleBrands: z.array(z.string()).default([]), // brand slugs
    // Rows are UNCONFIRMED until the client approves model lists (TODO.md Part 2B)
    compatibleMachines: z
      .array(z.object({ brand: z.string(), models: z.string(), todo: z.boolean().default(true) }))
      .default([]),
    relatedParts: z.array(z.string()).default([]), // product slugs
    faqs: z.array(faq).default([]),
  }),
});

const brands = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(), // H1
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(155),
    keyword: z.string(),
    brandName: z.string(),
    order: z.number().default(99),
    authorizedDealer: z.boolean().default(false),
    models: z.array(z.string()).default([]),
    modelsTodo: z.boolean().default(true), // TODO.md Part 2B: model lists unconfirmed
    partTypes: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  }),
});

const serviceAreas = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(), // H1
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(155),
    state: z.string(),
    abbr: z.string().length(2),
    order: z.number().default(99),
    // Reps covering this state (team collection slugs) — confirmed roster
    // from hardrok.com/contact.html, 2026-07-23.
    repSlugs: z.array(z.string()).default([]),
    localIndustries: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    shippingNotesTodo: z.boolean().default(true),
  }),
});

const industries = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(155),
    order: z.number().default(99),
    relatedProducts: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  }),
});

const team = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    jobTitle: z.string(),
    territory: z.string(),
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(155),
    order: z.number().default(99),
    active: z.boolean().default(true),
    // Direct contact details are unconfirmed until the client verifies the
    // roster (TODO.md Part 2D) — render TODO badges when *Confirmed is false.
    phone: z.string().optional(),
    phoneConfirmed: z.boolean().default(false),
    email: z.string().optional(),
    emailConfirmed: z.boolean().default(false),
    calendarUrl: z.string().url().optional(),
    photoTodo: z.boolean().default(true),
    quotesMost: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  }),
});

const equipment = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(155),
    category: z.string(),
    status: z.enum(['available', 'pending', 'sold']).default('available'),
    price: z.string().optional(), // e.g. "Call for price"
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

// Part-number landing pages, generated in bulk from QA-passed catalog rows
// via scripts/generate-parts-pages.mjs. Each markdown file becomes an
// indexed page capturing exact-match part-number searches.
// pageType controls the framing:
//   distributor — genuine supplier part HardRok distributes (Techroq)
//   dealer      — supplied through an authorized dealership (CMS Cepcor)
//   reference   — number+brand only; call-to-identify CTA (e.g. Symons refs)
const parts = defineCollection({
  type: 'content',
  schema: z.object({
    oemNumber: z.string(),
    brand: z.string(), // display name, e.g. "Techroq", "Symons"
    brandSlug: z.string().optional(), // links to /brands/{slug}/ when set
    supplier: z.string().optional(), // e.g. "Techroq USA"
    pageType: z.enum(['distributor', 'dealer', 'reference']).default('reference'),
    fitments: z.array(z.string()).default([]), // machines/rotors this fits
    partName: z.string().optional(), // e.g. "Feed Tube" (absent on reference pages)
    weightLbs: z.string().optional(),
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(155),
    prefillCategory: z.string().default('Crusher Parts'),
    // Verified interchange numbers (official supplier cross-reference data
    // only — never inferred groups), e.g. "Sandvik 485.0091-001".
    crossRefs: z.array(z.string()).default([]),
    draft: z.boolean().default(true),
  }),
});

// Brand/model part-number index pages: one page per brand+model family
// listing the catalog-lead numbers that do NOT merit individual pages
// (low-trust tiers of the cross-reference dataset). Captures exact-match
// part-number searches without publishing thousands of thin pages. Body
// carries the number list as markdown (links where individual pages exist).
const partIndexes = defineCollection({
  type: 'content',
  schema: z.object({
    brand: z.string(),
    modelFamily: z.string(),
    numberCount: z.number(),
    page: z.number().default(1), // pagination within a large group
    totalPages: z.number().default(1),
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(155),
    prefillCategory: z.string().default('Crusher Parts'),
    draft: z.boolean().default(false),
  }),
});

const resources = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(155),
    description: z.string(),
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

// Cross-reference cluster pages: one page per cross-ref group from the
// master dataset — all part numbers that industry catalog data references
// together for the same brand/model/part-type. Captures searches for ANY
// member number; makes no per-number interchange claims (sales team
// confirms exact interchange before quoting).
const partGroups = defineCollection({
  type: 'content',
  schema: z.object({
    brand: z.string(),
    modelFamily: z.string(),
    partType: z.string(), // e.g. "Bowl Liner"
    groupId: z.string(),
    numberCount: z.number(),
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(155),
    prefillCategory: z.string().default('Crusher Parts'),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  products,
  brands,
  'service-areas': serviceAreas,
  industries,
  team,
  'equipment-for-sale': equipment,
  resources,
  parts,
  'part-indexes': partIndexes,
  'part-groups': partGroups,
};
