// Sitewide business facts. Confirmed items come from TODO.md Part 1
// (verified on HardRok's existing site). Anything marked TODO is unconfirmed —
// render as a visible placeholder, never as an invented value.

export const SITE = {
  name: 'HardRok Equipment',
  legalName: 'HardRok Equipment, Inc.',
  origin: 'https://www.hardrok.com',
  phone: '(866) 427-3765',
  phoneVanity: '1-866-HARDROK', // confirmed on existing site
  phoneHref: 'tel:+18664273765',
  hours: 'Mon–Fri 7am–5pm PST',
  // TODO: confirm published Twilio text-to-quote number (TODO.md Part 2E).
  // Set PUBLIC_TEXT_QUOTE_NUMBER in the environment once provisioned.
  textQuoteNumber: import.meta.env.PUBLIC_TEXT_QUOTE_NUMBER ?? '',
  // TODO: confirm street address for NAP + LocalBusiness schema (TODO.md Part 2C).
  // Directory listings show Winnemucca, NV — unverified, so city/state only.
  addressLocality: 'Winnemucca',
  addressRegion: 'NV',
  streetAddressTodo: true,
  responsePromise:
    'A HardRok rep will call you within 2 business hours, Mon–Fri 7–5 PST.',
} as const;

// Mandatory on every product and brand page, verbatim (CONTENT.md header).
export const TRADEMARK_DISCLAIMER =
  'HardRok Equipment, Inc. is an independent supplier of premium aftermarket parts. ' +
  'All manufacturer names, numbers, and descriptions are used for reference only. ' +
  'It is not implied that any part listed is the product of these manufacturers.';

export const LEAD_ENDPOINT = '/.netlify/functions/lead-submit';

export type NavLink = { label: string; href: string };

export const NAV_LINKS: NavLink[] = [
  { label: 'Products', href: '/products/' },
  { label: 'Brands', href: '/brands/' },
  { label: 'Equipment for Sale', href: '/equipment-for-sale/' },
  { label: 'Service Areas', href: '/service-areas/' },
  { label: 'Industries', href: '/industries/' },
  { label: 'Team', href: '/team/' },
  { label: 'Resources', href: '/resources/' },
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
];

export const QUOTE_CATEGORIES = [
  'Crusher Parts',
  'Conveyor',
  'Screening',
  'Equipment',
  'Other',
] as const;

export const SERVICE_STATES = [
  { name: 'Nevada', abbr: 'NV' },
  { name: 'California', abbr: 'CA' },
  { name: 'Arizona', abbr: 'AZ' },
  { name: 'Utah', abbr: 'UT' },
  { name: 'Idaho', abbr: 'ID' },
] as const;
