import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// Canonical origin per SPEC.md §3. http->https and non-www->www 301s are
// enforced at the edge in netlify.toml.
export default defineConfig({
  site: 'https://www.hardrok.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap({
      // Keep paid-traffic landing pages out of sitemap.xml (they are noindex).
      // /lp/symons-parts/ is indexable per SPEC.md §5.8 and stays in.
      filter: (page) =>
        !page.includes('/lp/downtime-emergency/') &&
        !page.includes('/lp/screen-media-quote/') &&
        !page.includes('/thanks/'),
    }),
  ],
});
