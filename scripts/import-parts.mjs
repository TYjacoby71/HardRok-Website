// Bulk-generate part-number cross-reference pages from a dealer-catalog CSV.
//
// Usage: node scripts/import-parts.mjs catalog.csv [--draft]
//
// CSV columns (header row required):
//   oem_number,brand,brand_slug,machine,part_name[,notes]
// Example row:
//   N55308511,Nordberg/Metso,metso-nordberg-hp,HP300,Mantle,Standard profile
//
// Each row becomes src/content/parts/<slug>.md and publishes as
// /parts/<slug>/ on the next build — zero code changes. Pass --draft to
// generate unpublished files for review first.
import fs from 'node:fs';
import path from 'node:path';

const [, , csvPath, ...flags] = process.argv;
if (!csvPath) {
  console.error('Usage: node scripts/import-parts.mjs catalog.csv [--draft]');
  process.exit(1);
}
const asDraft = flags.includes('--draft');

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Minimal CSV parse with quoted-field support
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = ''; }
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const clamp = (s, max) => (s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…');

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const header = rows.shift().map((h) => h.trim().toLowerCase());
const col = (row, name) => {
  const i = header.indexOf(name);
  return i === -1 ? '' : (row[i] ?? '').trim();
};

const outDir = path.join('src', 'content', 'parts');
fs.mkdirSync(outDir, { recursive: true });

let written = 0, skipped = 0;
for (const row of rows) {
  const oem = col(row, 'oem_number');
  const brand = col(row, 'brand');
  const machine = col(row, 'machine');
  const partName = col(row, 'part_name');
  if (!oem || !brand || !machine || !partName) { skipped++; continue; }
  const brandSlug = col(row, 'brand_slug');
  const notes = col(row, 'notes');

  const slug = slugify(`${brand.split('/')[0]}-${oem}`);
  const metaTitle = clamp(`${oem} ${partName} Replacement | HardRok`, 60);
  const metaDescription = clamp(
    `Aftermarket ${partName.toLowerCase()} to fit ${brand} ${machine} — engineered replacement for OEM part ${oem}. Multiple grades. Fast quotes from HardRok.`,
    155,
  );

  const body = [
    `HardRok supplies a premium aftermarket ${partName.toLowerCase()} engineered to fit`,
    `${brand} ${machine} crushers, referenced against OEM part number ${oem}.`,
    notes ? `\n${notes}\n` : '',
    `Send your machine details and we'll confirm fit and quote against your OEM price.`,
  ].join(' ');

  const md = `---
oemNumber: '${oem.replace(/'/g, "''")}'
brand: '${brand.replace(/'/g, "''")}'
${brandSlug ? `brandSlug: '${brandSlug}'` : ''}
machine: '${machine.replace(/'/g, "''")}'
partName: '${partName.replace(/'/g, "''")}'
metaTitle: '${metaTitle.replace(/'/g, "''")}'
metaDescription: '${metaDescription.replace(/'/g, "''")}'
draft: ${asDraft}
---

${body}
`.replace(/\n\n+/g, '\n\n');

  fs.writeFileSync(path.join(outDir, `${slug}.md`), md);
  written++;
}

console.log(`written: ${written}, skipped (missing fields): ${skipped}${asDraft ? ' [drafts]' : ''}`);
console.log('Run `npm run build` to publish; pages appear at /parts/<slug>/.');
