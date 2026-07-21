// JSON-LD builders for structured data required by SPEC.md §3 and §5.
import { SITE } from './site';

type JsonLd = Record<string, unknown>;

export function organizationSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.legalName,
    url: SITE.origin,
    telephone: '+1-866-427-3765',
    logo: `${SITE.origin}/favicon.svg`,
    // Entity signals: HardRok's own public profiles.
    // TODO: add Google Business Profile / other profiles once confirmed.
    sameAs: ['https://www.linkedin.com/company/hardrok-equipment-inc'],
  };
}

export function articleSchema(opts: {
  headline: string;
  description: string;
  url: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: `${SITE.origin}${opts.url}`,
    author: { '@type': 'Organization', name: SITE.legalName },
    publisher: {
      '@type': 'Organization',
      name: SITE.legalName,
      logo: { '@type': 'ImageObject', url: `${SITE.origin}/favicon.svg` },
    },
  };
}

export function localBusinessSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: SITE.legalName,
    url: SITE.origin,
    telephone: '+1-866-427-3765',
    openingHours: 'Mo-Fr 07:00-17:00',
    // TODO: add streetAddress + postalCode once HQ address is confirmed (TODO.md Part 2C)
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE.addressLocality,
      addressRegion: SITE.addressRegion,
      addressCountry: 'US',
    },
  };
}

export function breadcrumbSchema(
  items: { label: string; href: string }[],
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: `${SITE.origin}${item.href}`,
    })),
  };
}

export function faqSchema(items: { q: string; a: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function productSchema(opts: {
  name: string;
  description: string;
  url: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: opts.name,
    description: opts.description,
    url: `${SITE.origin}${opts.url}`,
    brand: { '@type': 'Brand', name: 'HardRok Equipment' },
  };
}

export function personSchema(opts: {
  name: string;
  jobTitle: string;
  url: string;
  telephone?: string;
  email?: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: opts.name,
    jobTitle: opts.jobTitle,
    url: `${SITE.origin}${opts.url}`,
    worksFor: { '@type': 'Organization', name: SITE.legalName },
    ...(opts.telephone ? { telephone: opts.telephone } : {}),
    ...(opts.email ? { email: opts.email } : {}),
  };
}

export function serviceAreaSchema(opts: { state: string; url: string }): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Crusher, conveyor & screening parts supply in ${opts.state}`,
    url: `${SITE.origin}${opts.url}`,
    provider: { '@type': 'Organization', name: SITE.legalName },
    areaServed: { '@type': 'State', name: opts.state },
  };
}
