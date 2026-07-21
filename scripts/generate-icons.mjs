// Regenerate raster brand assets from the SVG sources.
// Run: node scripts/generate-icons.mjs
// (sharp comes in via Astro's own dependencies)
import sharp from 'sharp';

await sharp('public/images/og-default.svg', { density: 150 })
  .resize(1200, 630)
  .png()
  .toFile('public/images/og-default.png');
console.log('og-default.png 1200x630 written');

await sharp('public/favicon.svg', { density: 300 })
  .resize(180, 180)
  .png()
  .toFile('public/apple-touch-icon.png');
console.log('apple-touch-icon.png 180x180 written');
