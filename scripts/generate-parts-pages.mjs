// STAGE 3 of the parts pipeline: generate part-number landing pages from the
// normalized catalog CSV — ONLY for rows that passed QA (stage 2) or are
// explicitly included as reference-only pages.
//
// USAGE
//   node scripts/generate-parts-pages.mjs <normalized.csv> [options]
// OPTIONS
//   --allowlist <rows-passed.csv>  QA output; only part numbers present in it
//                                  generate full pages (default: required
//                                  unless --review-only)
//   --include-review               also generate minimal "reference" pages for
//                                  confidence=review rows (number+brand+CTA)
//   --review-only                  generate ONLY the reference pages
//   --rows <a-b>                   generate only grouped pages #a through #b
//                                  (1-based, after grouping; e.g. --rows 1-50)
//   --draft                        write pages with draft:true (unpublished)
//   --out <dir>                    output dir (default src/content/parts)
//
// INPUT CSV COLUMNS (PART_NUMBER_LEADS_NORMALIZED.csv):
//   source_family, supplier_or_source, brand_family,
//   machine_model_or_fitment, part_number, description, weight,
//   source_url, confidence, notes, raw_context
//
// PAGE FORM (what each generated page contains):
//   URL:    /parts/{brand-slug}-{part-number-slug}/
//   H1:     "{Brand} {PN} — {Description}"  (or "{Brand} Part Number {PN}")
//   Spec list: part number, brand, description, weight, fitments
//   Body:   supplier framing (distributor/dealer) or call-to-identify copy
//   CTA:    compact quote form with the part number prefilled + phone
//   Plus:   trademark disclaimer, Product schema, breadcrumbs (via template)
//
// Rows sharing brand+part_number are MERGED into one page with all fitments
// listed (prevents slug collisions and duplicate pages).
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith('--'));
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const has = (name) => args.includes(name);
if (!csvPath) {
  console.error('Usage: node scripts/generate-parts-pages.mjs <normalized.csv> [options]');
  process.exit(1);
}
const outDir = opt('--out') ?? path.join('src', 'content', 'parts');
const asDraft = has('--draft');

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = ''; }
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const all = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const header = all.shift().map((h) => h.trim().toLowerCase());
const col = (row, name) => {
  const i = header.indexOf(name);
  return i === -1 ? '' : (row[i] ?? '').trim();
};

// QA allowlist: set of part numbers that passed stage-2 validation
let allow = null;
const allowPath = opt('--allowlist');
if (allowPath) {
  const a = parseCsv(fs.readFileSync(allowPath, 'utf8'));
  const ah = a.shift().map((h) => h.trim().toLowerCase());
  const pnIdx = ah.indexOf('part_number');
  allow = new Set(a.map((r) => (r[pnIdx] ?? '').trim()).filter(Boolean));
}
if (!allow && !has('--review-only')) {
  console.error('Refusing to generate full pages without --allowlist (QA gate). Use --review-only for reference pages alone.');
  process.exit(1);
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const clamp = (s, max) => (s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…');
const tidyFitment = (s) =>
  s.replace(/\s*-\s*Wear Parts Identification Sheet\s*$/i, '').trim();
const esc = (s) => String(s).replace(/'/g, "''");

const SUPPLIER_META = {
  techroq_official_catalogue: { pageType: 'distributor', supplier: 'Techroq USA' },
  cms_official_sitemap: { pageType: 'dealer', supplier: 'CMS Cepcor', brandSlug: 'cms-cepcor' },
};

// Group rows: full pages (QA-passed high confidence) + reference pages (review)
const groups = new Map();
for (const row of all) {
  const pn = col(row, 'part_number');
  const brand = col(row, 'brand_family') || 'Crusher';
  const confidence = col(row, 'confidence').toLowerCase();
  if (!pn) continue;

  const isReview = confidence === 'review';
  if (isReview && !has('--include-review') && !has('--review-only')) continue;
  if (!isReview) {
    if (has('--review-only')) continue;
    if (confidence !== 'high') continue; // third-party rows never generate pages
    if (allow && !allow.has(pn)) continue; // QA gate
  }

  const key = `${slugify(brand)}|${pn}`;
  if (!groups.has(key)) {
    groups.set(key, {
      pn,
      brand,
      sourceFamily: col(row, 'source_family'),
      partName: col(row, 'description'),
      weight: col(row, 'weight'),
      fitments: new Set(),
      isReview,
    });
  }
  const g = groups.get(key);
  const fit = tidyFitment(col(row, 'machine_model_or_fitment'));
  if (fit) g.fitments.add(fit);
  if (!g.partName && col(row, 'description')) g.partName = col(row, 'description');
}

// Range selection over the grouped, ordered list
let list = [...groups.values()];
const range = opt('--rows');
if (range) {
  const [a, b] = range.split('-').map(Number);
  list = list.slice((a || 1) - 1, b || list.length);
}

fs.mkdirSync(outDir, { recursive: true });
let written = 0;
for (const g of list) {
  const meta = SUPPLIER_META[g.sourceFamily] ?? {};
  const pageType = g.isReview || !g.partName ? 'reference' : (meta.pageType ?? 'reference');
  const slug = slugify(`${g.brand}-${g.pn}`);
  const fitments = [...g.fitments];

  const metaTitle = clamp(
    g.partName ? `${g.pn} ${g.partName} | HardRok` : `${g.brand} ${g.pn} | Part Quote | HardRok`,
    60,
  );
  const metaDescription = clamp(
    g.partName
      ? `${g.brand} ${g.pn} — ${g.partName}${fitments.length ? ` for ${fitments[0]}` : ''}. Quote from HardRok Equipment: call (866) 427-3765 or send the part number online.`
      : `${g.brand} part number ${g.pn} — call HardRok Equipment at (866) 427-3765 to speak with a representative for pricing, availability, and fitment.`,
    155,
  );

  const body =
    pageType === 'reference'
      ? `We stock and source parts against ${g.brand} reference numbers every day. Send this number through the form, or call and read it to a parts specialist — we'll confirm what it is, whether it's on the shelf, and what it costs.`
      : `Send your machine details with the form below and we'll confirm fit and lead time along with your quote.`;

  const fm = [
    '---',
    `# Generated by scripts/generate-parts-pages.mjs from ${path.basename(csvPath)}`,
    `# (QA-gated: stage-2 validated rows${g.isReview ? '; reference-only row' : ''})`,
    `oemNumber: '${esc(g.pn)}'`,
    `brand: '${esc(g.brand)}'`,
    meta.brandSlug ? `brandSlug: '${meta.brandSlug}'` : null,
    meta.supplier ? `supplier: '${esc(meta.supplier)}'` : null,
    `pageType: '${pageType}'`,
    fitments.length ? `fitments:\n${fitments.map((f) => `  - '${esc(f)}'`).join('\n')}` : null,
    g.partName && pageType !== 'reference' ? `partName: '${esc(g.partName)}'` : null,
    g.weight ? `weightLbs: '${esc(g.weight)}'` : null,
    `metaTitle: '${esc(metaTitle)}'`,
    `metaDescription: '${esc(metaDescription)}'`,
    `draft: ${asDraft}`,
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  fs.writeFileSync(path.join(outDir, `${slug}.md`), `${fm}\n\n${body}\n`);
  written++;
}

console.log(`grouped pages available: ${groups.size}; written: ${written}${asDraft ? ' [drafts]' : ''} -> ${outDir}`);
