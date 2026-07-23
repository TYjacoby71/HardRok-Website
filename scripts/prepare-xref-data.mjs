// Prepare the parts cross-reference dataset for DB ingestion.
// Reads the crossref-enriched catalog CSVs (scratchpad) and emits
// table-shaped NDJSON.gz bundles under netlify/functions/data/ for the
// temporary ingest-xref-background function to load. All heavy shaping
// happens here, locally — the function just parses and inserts.
//
// Usage: node scripts/prepare-xref-data.mjs <crossref-sweep-dir>
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: node scripts/prepare-xref-data.mjs <crossref-sweep-dir>');
  process.exit(1);
}

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
const load = (name) => {
  const rows = parseCsv(fs.readFileSync(path.join(dir, name), 'utf8'));
  const header = rows.shift().map((h) => h.trim().toLowerCase());
  return { header, rows, col: (row, n) => { const i = header.indexOf(n); return i === -1 ? '' : (row[i] ?? '').trim(); } };
};

// Published page slugs (from the site's generated parts pages)
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const partsDir = path.join('src', 'content', 'parts');
const publishedSlugs = new Set(
  fs.readdirSync(partsDir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')),
);

// Main dataset
const m = load('PART_NUMBER_LEADS_CROSSREF_ENRICHED.csv');
const MAPPED = new Set([
  'part_number', 'canonical_brand', 'brand_family', 'model_family_extracted',
  'equipment_type_enriched', 'part_category_enriched', 'description', 'weight',
  'source_domain', 'source_type_enriched', 'source_url', 'source_trust_tier',
  'confidence', 'exact_part_number_source_count', 'catalog_page_priority',
]);
const out = fs.createWriteStream(path.join('netlify', 'functions', 'data', 'xref_rows.ndjson.gz'));
const gz = zlib.createGzip({ level: 9 });
gz.pipe(out);
let n = 0, withPage = 0;
for (const r of m.rows) {
  const pn = m.col(r, 'part_number');
  if (!pn) continue;
  const brand = m.col(r, 'canonical_brand') || m.col(r, 'brand_family') || null;
  const slug = slugify(`${brand ?? ''}-${pn}`);
  const pageUrl = publishedSlugs.has(slug) ? `/parts/${slug}/` : null;
  if (pageUrl) withPage++;
  const extra = {};
  for (let i = 0; i < m.header.length; i++) {
    if (MAPPED.has(m.header[i])) continue;
    const v = (r[i] ?? '').trim();
    if (v) extra[m.header[i]] = v;
  }
  const rec = {
    part_number: pn,
    brand,
    model_family: m.col(r, 'model_family_extracted') || m.col(r, 'machine_model_or_fitment') || null,
    equipment_type: m.col(r, 'equipment_type_enriched') || null,
    part_category: m.col(r, 'part_category_enriched') || null,
    description: m.col(r, 'description') || null,
    weight: m.col(r, 'weight') || null,
    source_domain: m.col(r, 'source_domain') || null,
    source_type: m.col(r, 'source_type_enriched') || null,
    source_url: m.col(r, 'source_url') || null,
    trust_tier: m.col(r, 'source_trust_tier') || null,
    confidence: m.col(r, 'confidence') || null,
    crossref_group: (m.col(r, 'cross_ref_group_ids').split(';')[0] || '').trim() || null,
    overlap_sources: parseInt(m.col(r, 'exact_part_number_source_count'), 10) || null,
    build_priority: m.col(r, 'catalog_page_priority') || null,
    page_url: pageUrl,
    extra: Object.keys(extra).length ? extra : null,
  };
  gz.write(JSON.stringify(rec) + '\n');
  n++;
}
gz.end();

// Groups dataset: one CSV row per GROUP with a "pn ; pn ; pn" list —
// explode into one membership row per part number.
const g = load('CROSS_REFERENCE_GROUPS.csv');
const gout = fs.createWriteStream(path.join('netlify', 'functions', 'data', 'xref_groups.ndjson.gz'));
const ggz = zlib.createGzip({ level: 9 });
ggz.pipe(gout);
let gn = 0;
for (const r of g.rows) {
  const groupId = g.col(r, 'cross_ref_group_id');
  if (!groupId) continue;
  const groupMeta = {};
  for (const h of ['group_confidence', 'model_key', 'description_key', 'equipment_type', 'part_number_count', 'row_count', 'source_domains', 'source_families', 'brands']) {
    const v = g.col(r, h);
    if (v) groupMeta[h] = v;
  }
  for (const pn of g.col(r, 'part_numbers').split(';').map((s) => s.trim()).filter(Boolean)) {
    ggz.write(JSON.stringify({
      group_id: groupId,
      group_kind: g.col(r, 'basis') || null,
      part_number: pn,
      brand: null,
      extra: Object.keys(groupMeta).length ? groupMeta : null,
    }) + '\n');
    gn++;
  }
}
ggz.end();

Promise.all([
  new Promise((res) => out.on('finish', res)),
  new Promise((res) => gout.on('finish', res)),
]).then(() => {
  console.log(`xref rows: ${n} (page_url set: ${withPage}); group rows: ${gn}`);
  console.log('groups header:', g.header.join(','));
  for (const f of ['xref_rows.ndjson.gz', 'xref_groups.ndjson.gz']) {
    const p = path.join('netlify', 'functions', 'data', f);
    console.log(f, (fs.statSync(p).size / 1e6).toFixed(2) + ' MB');
  }
});
