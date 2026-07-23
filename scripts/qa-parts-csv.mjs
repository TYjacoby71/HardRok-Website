// STAGE 2 of the parts pipeline: adversarial QA of a parts CSV BEFORE any
// page generation. Every check is designed to refute rows, not confirm them.
//
// Usage: node scripts/qa-parts-csv.mjs <parts.csv> <text-cache-dir> <out-dir>
//   <parts.csv> columns (flexible header): oem_number/part_number, brand,
//     machine, part_name/description, source_pdf (optional), page (optional)
//   <text-cache-dir> the text/ dir written by extract-parts-from-pdf.mjs
// Outputs: <out-dir>/qa-report.md, <out-dir>/rows-passed.csv,
//          <out-dir>/rows-rejected.csv (with reject reasons)
import fs from 'node:fs';
import path from 'node:path';

const [, , csvPath, textDir, outDir] = process.argv;
if (!csvPath || !outDir) {
  console.error('Usage: node scripts/qa-parts-csv.mjs <parts.csv> <text-cache-dir> <out-dir>');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

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

const raw = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const header = raw.shift().map((h) => h.trim().toLowerCase());
const idx = (names) => names.map((n) => header.indexOf(n)).find((i) => i !== -1) ?? -1;
const iPn = idx(['oem_number', 'part_number', 'pn', 'pn_candidate']);
const iBrand = idx(['brand', 'brand_family']);
const iMachine = idx(['machine', 'model', 'machine_model_or_fitment']);
const iName = idx(['part_name', 'description', 'desc']);
const iSrc = idx(['source_pdf', 'source_url', 'source', 'pdf']);
if (iPn === -1) { console.error(`No part-number column found in header: ${header.join(',')}`); process.exit(1); }

// Load text cache for provenance round-trips (normalize whitespace)
const texts = {};
if (textDir && fs.existsSync(textDir)) {
  for (const f of fs.readdirSync(textDir)) {
    texts[f.replace(/\.txt$/, '')] = fs.readFileSync(path.join(textDir, f), 'utf8').replace(/\s+/g, ' ');
  }
}
const allText = Object.values(texts).join(' ');

const PN_OK = new RegExp(
  '^(?:' +
    [
      '\\d{2,4}-\\d{3,4}(?:-[A-Z0-9]{1,4})?', // 9448-7434, 5520-8145-A3
      '\\d{2}-\\d{4}-\\d{4}', // 70-1620-0114
      '\\d{3}-\\d{4}-\\d{3}', // CMS Cepcor 442-3765-001
      '[A-Z]{1,2}\\d{7,10}', // N55308511
      '[A-Z]\\d{2,3}[A-Z0-9]{5,9}(?:/[A-Z0-9]{1,2})?', // Techroq B702S7140A, B69274106G/W
      '\\d{3}\\.\\d{4}-\\d{3}', // Sandvik 485.0091-001
      '\\d{6,10}', // Metso 10-digit
    ].join('|') +
    ')$',
);
const NAV_JUNK = /home|contact|request a quote|copyright|about us|www\.|http|@|password|cookie/i;
const KNOWN_BRANDS = /symons|nordberg|metso|hp|mp|sandvik|omnicone|gyradisc|telsmith|cedarapids|allis|excel|fls|gyratory|techroq|cepcor|cms|trio|jaw|cone|vsi/i;

const passed = [], rejected = [];
const stats = { total: 0, byReason: {} };
const seen = new Map();

for (const row of raw) {
  if (row.every((c) => !c.trim())) continue;
  stats.total++;
  const pn = (row[iPn] ?? '').trim();
  const brand = iBrand !== -1 ? (row[iBrand] ?? '').trim() : '';
  const machine = iMachine !== -1 ? (row[iMachine] ?? '').trim() : '';
  const name = iName !== -1 ? (row[iName] ?? '').trim() : '';
  const src = iSrc !== -1 ? (row[iSrc] ?? '').trim() : '';
  const reasons = [];

  // 1. Part-number shape
  if (!pn) reasons.push('empty_pn');
  else if (!PN_OK.test(pn)) reasons.push(`pn_shape:${pn}`);
  // 2. Provenance round-trip: PN must literally exist in its claimed source
  //    (or anywhere in the cache if no source column)
  if (pn && Object.keys(texts).length > 0) {
    const hay = src && texts[src] ? texts[src] : allText;
    if (!hay.includes(pn)) reasons.push('pn_not_in_source_text');
  }
  // 3. Description sanity
  if (name && NAV_JUNK.test(name)) reasons.push('desc_contains_junk');
  if (name && name.length > 120) reasons.push('desc_too_long');
  if (!name) reasons.push('empty_description');
  // 4. Brand/machine vocabulary
  if (brand && !KNOWN_BRANDS.test(brand)) reasons.push(`unknown_brand:${brand}`);
  // 5. Duplicates (same PN + machine)
  const key = `${pn}|${machine.toLowerCase()}`;
  if (seen.has(key)) reasons.push(`duplicate_of_row_${seen.get(key)}`);
  else seen.set(key, stats.total);

  const rec = { pn, brand, machine, name, src, reasons };
  if (reasons.length) {
    rejected.push(rec);
    for (const r of reasons) {
      const k = r.split(':')[0];
      stats.byReason[k] = (stats.byReason[k] ?? 0) + 1;
    }
  } else passed.push(rec);
}

const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
const toCsv = (recs, withReasons) =>
  ['part_number,brand,machine,part_name,source_pdf' + (withReasons ? ',reject_reasons' : '')]
    .concat(
      recs.map((r) =>
        [esc(r.pn), esc(r.brand), esc(r.machine), esc(r.name), esc(r.src)]
          .concat(withReasons ? [esc(r.reasons.join('; '))] : [])
          .join(','),
      ),
    )
    .join('\n');

fs.writeFileSync(path.join(outDir, 'rows-passed.csv'), toCsv(passed, false));
fs.writeFileSync(path.join(outDir, 'rows-rejected.csv'), toCsv(rejected, true));

const report = `# Parts CSV QA Report
Input: ${csvPath}
Text cache: ${textDir ?? '(none — provenance checks skipped)'} (${Object.keys(texts).length} PDFs)

| Metric | Count |
| --- | --- |
| Total rows | ${stats.total} |
| Passed all checks | ${passed.length} |
| Rejected | ${rejected.length} |

## Rejection reasons
${Object.entries(stats.byReason).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- none'}

## Random sample of PASSED rows for human spot-check (verify against source PDFs)
${passed.slice(0, 200).filter((_, i) => i % Math.max(1, Math.floor(passed.length / 15)) === 0).slice(0, 15).map((r) => `- ${r.pn} — ${r.name} [${r.brand} ${r.machine}] (${r.src || 'no source'})`).join('\n') || '- none'}
`;
fs.writeFileSync(path.join(outDir, 'qa-report.md'), report);
console.log(report);
