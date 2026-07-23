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
    repSlug: z.string().optional(), // TODO.md Part 2D: roster unconfirmed
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

// Part-number cross-reference pages ("Replacement for {OEM number}").
// Generated in bulk from dealer catalogs via scripts/import-parts.mjs —
// each markdown file becomes an indexed page capturing exact-match
// part-number searches. draft defaults true so nothing unconfirmed ships.
const parts = defineCollection({
  type: 'content',
  schema: z.object({
    oemNumber: z.string(),
    brand: z.string(), // display name, e.g. "Nordberg/Metso"
    brandSlug: z.string().optional(), // links to /brands/{slug}/ when set
    machine: z.string(), // e.g. "HP300"
    partName: z.string(), // e.g. "Mantle"
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(155),
    prefillCategory: z.string().default('Crusher Parts'),
    draft: z.boolean().default(true),
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

export const collections = {
  products,
  brands,
  'service-areas': serviceAreas,
  industries,
  team,
  'equipment-for-sale': equipment,
  resources,
  parts,
};
