// STAGE 4 of the parts pipeline: expand coverage from the sectioned master
// dataset (mirrors parts_xref in Supabase). Three jobs:
//
//  A. CROSS-REFS — rewrite published Techroq pages with their official
//     interchange numbers, and generate pages for the OEM-numbered side of
//     each official cross-reference claim (master section 02).
//  B. INDIVIDUAL GAPS — pages for high/medium-trust numbers without pages:
//     section 03 (official CMS, dealer framing with description),
//     sections 04-05 (multi-source/mixed: reference framing, NO fitment or
//     description claims — "requires confirmation from our sales team").
//  C. INDEX PAGES — sections 06-08 (low-trust tail) grouped into
//     brand+model part-number index pages (paginated at 1000 numbers),
//     instead of thousands of thin individual pages, to avoid
//     scaled-content SEO penalties. Same search capture, safer shape.
//
// Usage: node scripts/generate-parts-expansion.mjs <enriched.csv> <sectionmap.csv>
import fs from 'node:fs';
import path from 'node:path';

const [csvPath, mapPath] = process.argv.slice(2);
if (!csvPath || !mapPath) {
  console.error('Usage: node scripts/generate-parts-expansion.mjs <enriched.csv> <sectionmap.csv>');
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
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const clamp = (s, max) => (s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…');
const esc = (s) => String(s).replace(/'/g, "''");
const tidyFitment = (s) => s.replace(/\s*-\s*Wear Parts Identification Sheet\s*$/i, '').trim();

// Section lookup
const sm = parseCsv(fs.readFileSync(mapPath, 'utf8'));
const sh = sm.shift().map((c) => c.trim());
const si = Object.fromEntries(sh.map((c, i) => [c, i]));
const secByKey = new Map();
for (const r of sm) {
  const k = `${r[si.part_number]}|${r[si.canonical_brand] || r[si.brand_family]}|${r[si.source_url]}`;
  if (!secByKey.has(k)) secByKey.set(k, r[si.master_section]);
}

// Master rows
const m = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const h = m.shift().map((c) => c.trim());
const ix = Object.fromEntries(h.map((c, i) => [c, i]));
const rows = m
  .map((r) => {
    const pn = (r[ix.part_number] ?? '').trim();
    const brand = (r[ix.canonical_brand] ?? '').trim() || (r[ix.brand_family] ?? '').trim() || 'unknown';
    return {
      pn,
      brand,
      model: (r[ix.model_family_extracted] ?? '').trim(),
      fitment: (r[ix.machine_model_or_fitment] ?? '').trim(),
      desc: (r[ix.description] ?? '').trim(),
      weight: (r[ix.weight] ?? '').trim(),
      url: (r[ix.source_url] ?? '').trim(),
      family: (r[ix.source_family] ?? '').trim(),
      norm: (r[ix.normalized_part_number] ?? '').trim(),
      xr: (r[ix.explicit_cross_reference_numbers] ?? '').trim(),
      overlap: parseInt(r[ix.exact_part_number_source_count] ?? '', 10) || 1,
      sec: '',
    };
  })
  .filter((r) => r.pn);
for (const r of rows) r.sec = secByKey.get(`${r.pn}|${r.brand}|${r.url}`) ?? '';

// Prettiest display form per normalized number, and row lookup by norm
const displayByNorm = new Map();
const rowByNorm = new Map();
const punct = (s) => (s.match(/[^A-Za-z0-9]/g) ?? []).length;
for (const r of rows) {
  if (!r.norm) continue;
  const cur = displayByNorm.get(r.norm);
  if (!cur || punct(r.pn) > punct(cur) || (punct(r.pn) === punct(cur) && r.pn.length > cur.length)) {
    displayByNorm.set(r.norm, r.pn);
  }
  if (!rowByNorm.has(r.norm) || r.sec < rowByNorm.get(r.norm).sec) rowByNorm.set(r.norm, r);
}
const crossRefStrings = (xr) =>
  xr
    .split(/[;|,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((n) => {
      const norm = n.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const disp = displayByNorm.get(norm) ?? displayByNorm.get(n) ?? n;
      const brand = rowByNorm.get(norm)?.brand ?? rowByNorm.get(n)?.brand ?? '';
      return brand ? `${brand} ${disp}` : disp;
    });

const partsDir = path.join('src', 'content', 'parts');
const existing = new Set(fs.readdirSync(partsDir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')));
const written = { rewrittenTechroq: 0, crossrefPages: 0, officialGaps: 0, referenceGaps: 0, indexPages: 0 };
const allPageSlugs = new Set(existing);

const writePart = (slug, fm, body) => {
  fs.writeFileSync(path.join(partsDir, `${slug}.md`), `---\n${fm.filter(Boolean).join('\n')}\n---\n\n${body}\n`);
  allPageSlugs.add(slug);
};

// Group rows by slug (brand+pn)
const bySlug = new Map();
for (const r of rows) {
  const slug = slugify(`${r.brand}-${r.pn}`);
  if (!bySlug.has(slug)) bySlug.set(slug, []);
  bySlug.get(slug).push(r);
}

// ---- A1: rewrite published Techroq distributor pages with crossRefs ----
for (const [slug, rs] of bySlug) {
  if (!rs.some((r) => r.family === 'techroq_official_catalogue') || !existing.has(slug)) continue;
  const r0 = rs.find((r) => r.family === 'techroq_official_catalogue');
  const fitments = [...new Set(rs.filter((r) => r.fitment).map((r) => tidyFitment(r.fitment)))];
  const xrefs = [...new Set(rs.flatMap((r) => (r.xr ? crossRefStrings(r.xr) : [])))];
  const metaTitle = clamp(`${r0.pn} ${r0.desc} | HardRok`, 60);
  const metaDescription = clamp(
    `Techroq ${r0.pn} — ${r0.desc}${fitments.length ? ` for ${fitments[0]}` : ''}. Quote from HardRok Equipment: call (866) 427-3765 or send the part number online.`,
    155,
  );
  writePart(slug, [
    '---'.length ? `# Generated by scripts/generate-parts-expansion.mjs (official Techroq + cross-refs)` : null,
    `oemNumber: '${esc(r0.pn)}'`,
    `brand: 'Techroq'`,
    `supplier: 'Techroq USA'`,
    `pageType: 'distributor'`,
    fitments.length ? `fitments:\n${fitments.map((f) => `  - '${esc(f)}'`).join('\n')}` : null,
    r0.desc ? `partName: '${esc(r0.desc)}'` : null,
    r0.weight ? `weightLbs: '${esc(r0.weight)}'` : null,
    xrefs.length ? `crossRefs:\n${xrefs.map((x) => `  - '${esc(x)}'`).join('\n')}` : null,
    `metaTitle: '${esc(metaTitle)}'`,
    `metaDescription: '${esc(metaDescription)}'`,
    `draft: false`,
  ], `Send your machine details with the form below and we'll confirm fit and lead time along with your quote.`);
  written.rewrittenTechroq++;
}

// ---- A2 + B: individual pages for gaps in sections 02-05 ----
for (const [slug, rs] of bySlug) {
  if (allPageSlugs.has(slug)) continue;
  const sec = rs.map((r) => r.sec).sort()[0] ?? '';
  if (!/^0[2-5]/.test(sec)) continue;
  const r0 = rs[0];
  const brandLine = `brand: '${esc(r0.brand)}'`;

  if (sec.startsWith('02')) {
    // Official Techroq cross-reference claim: OEM-numbered side
    const xrefs = [...new Set(rs.flatMap((r) => (r.xr ? crossRefStrings(r.xr) : [])))];
    const partName = r0.desc || rowByNorm.get(rs.find((r) => r.xr)?.xr.replace(/[^A-Za-z0-9]/g, '').toUpperCase() ?? '')?.desc || '';
    writePart(slug, [
      `# Generated by scripts/generate-parts-expansion.mjs (official cross-reference claim)`,
      `oemNumber: '${esc(r0.pn)}'`, brandLine,
      `pageType: 'reference'`,
      partName ? `partName: '${esc(partName)}'` : null,
      xrefs.length ? `crossRefs:\n${xrefs.map((x) => `  - '${esc(x)}'`).join('\n')}` : null,
      `metaTitle: '${esc(clamp(`${r0.pn} Cross Reference | HardRok`, 60))}'`,
      `metaDescription: '${esc(clamp(`${r0.brand} ${r0.pn} cross-references to a genuine Techroq part HardRok distributes. Call (866) 427-3765 for pricing and availability.`, 155))}'`,
      `draft: false`,
    ], `Per Techroq's official cross-reference data, this ${r0.brand} number interchanges with the genuine Techroq part listed above — which HardRok supplies as a national Techroq USA distributor. Send the number for a quote.`);
    written.crossrefPages++;
  } else if (sec.startsWith('03')) {
    // Official source (CMS Cepcor) — dealer framing with real description
    writePart(slug, [
      `# Generated by scripts/generate-parts-expansion.mjs (official source, section 03)`,
      `oemNumber: '${esc(r0.pn)}'`, brandLine,
      `brandSlug: 'cms-cepcor'`,
      `supplier: 'CMS Cepcor'`,
      `pageType: 'dealer'`,
      r0.desc ? `partName: '${esc(r0.desc)}'` : null,
      `metaTitle: '${esc(clamp(r0.desc ? `${r0.pn} ${r0.desc} | HardRok` : `${r0.brand} ${r0.pn} | HardRok`, 60))}'`,
      `metaDescription: '${esc(clamp(`${r0.brand} ${r0.pn}${r0.desc ? ` — ${r0.desc}` : ''}. Quote from HardRok Equipment: call (866) 427-3765 or send the part number online.`, 155))}'`,
      `draft: false`,
    ], `Send your machine details with the form below and we'll confirm fit and lead time along with your quote.`);
    written.officialGaps++;
  } else {
    // Sections 04-05: multi-source / mixed — reference framing, no claims
    const maxOverlap = Math.max(...rs.map((r) => r.overlap));
    const models = [...new Set(rs.map((r) => r.model).filter(Boolean))];
    const srcNote = maxOverlap > 1
      ? `This number is recorded consistently across ${maxOverlap} independent industry catalog sources${models.length ? ` in connection with ${r0.brand} ${models[0]} equipment` : ''}.`
      : `This number appears in industry catalog data${models.length ? ` in connection with ${r0.brand} ${models[0]} equipment` : ''}.`;
    writePart(slug, [
      `# Generated by scripts/generate-parts-expansion.mjs (sections 04-05, reference only)`,
      `oemNumber: '${esc(r0.pn)}'`, brandLine,
      `pageType: 'reference'`,
      `metaTitle: '${esc(clamp(`${r0.brand} ${r0.pn} | Part Quote | HardRok`, 60))}'`,
      `metaDescription: '${esc(clamp(`${r0.brand} part number ${r0.pn} — call HardRok Equipment at (866) 427-3765 to speak with a representative for pricing, availability, and fitment.`, 155))}'`,
      `draft: false`,
    ], `${srcNote} Full details for this part number require confirmation from our sales team — send it through the form or call and read it to a parts specialist.`);
    written.referenceGaps++;
  }
}

// ---- C: index pages for sections 06-08, grouped by brand+model ----
const idxDir = path.join('src', 'content', 'part-indexes');
fs.mkdirSync(idxDir, { recursive: true });
const groups = new Map();
for (const r of rows) {
  if (!/^0[6-8]/.test(r.sec) || r.brand === 'unknown') continue;
  const model = r.model || 'Other';
  const k = `${r.brand}||${model}`;
  if (!groups.has(k)) groups.set(k, new Map());
  const g = groups.get(k);
  if (!g.has(r.pn)) g.set(r.pn, slugify(`${r.brand}-${r.pn}`));
}
const PER_PAGE = 1000;
for (const [key, nums] of groups) {
  const [brand, model] = key.split('||');
  const sorted = [...nums.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const label = model.toLowerCase() === brand.toLowerCase() ? brand : `${brand} ${model}`;
  for (let p = 1; p <= totalPages; p++) {
    const chunk = sorted.slice((p - 1) * PER_PAGE, p * PER_PAGE);
    const slug = slugify(`${brand}-${model}`) + (p > 1 ? `-${p}` : '');
    const body = chunk
      .map(([pn, pslug]) => (allPageSlugs.has(pslug) ? `- [${pn}](/parts/${pslug}/)` : `- ${pn}`))
      .join('\n');
    const fm = [
      `# Generated by scripts/generate-parts-expansion.mjs (sections 06-08 index)`,
      `brand: '${esc(brand)}'`,
      `modelFamily: '${esc(model)}'`,
      `numberCount: ${chunk.length}`,
      `page: ${p}`,
      `totalPages: ${totalPages}`,
      `metaTitle: '${esc(clamp(`${label} Part Numbers${p > 1 ? ` p${p}` : ''} | HardRok`, 60))}'`,
      `metaDescription: '${esc(clamp(`${label} part number index${p > 1 ? `, page ${p}` : ''}: ${chunk.length} numbers our team quotes against. Call HardRok at (866) 427-3765 with your number.`, 155))}'`,
      `draft: false`,
    ];
    fs.writeFileSync(path.join(idxDir, `${slug}.md`), `---\n${fm.join('\n')}\n---\n\n${body}\n`);
    written.indexPages++;
  }
}

console.log(JSON.stringify(written), '| total part pages now:', allPageSlugs.size);
