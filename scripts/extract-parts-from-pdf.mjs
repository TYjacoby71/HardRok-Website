// STAGE 1 of the parts pipeline: PDF -> per-page text cache + part-number
// candidate mining. Produces raw material for human/QA review — it does NOT
// write site content. (Stage 2 = qa-parts-csv.mjs validation; Stage 3 =
// import-parts.mjs page generation, run only on QA-passed rows.)
//
// Usage: node scripts/extract-parts-from-pdf.mjs <pdf-dir> <out-dir>
//   <out-dir>/text/<pdf-name>.txt       full extracted text (page-delimited)
//   <out-dir>/candidates.csv            source_pdf,page,pn_candidate,context
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const [, , pdfDir, outDir] = process.argv;
if (!pdfDir || !outDir) {
  console.error('Usage: node scripts/extract-parts-from-pdf.mjs <pdf-dir> <out-dir>');
  process.exit(1);
}
fs.mkdirSync(path.join(outDir, 'text'), { recursive: true });

// Part-number shapes seen in this industry (Symons/Nordberg/HP/Excel):
//   9448-7434 · 5520-8145-A3 · 70-1620-0114 · 1048516198 · N55308511
const PN_PATTERNS = [
  /\b\d{2,4}-\d{3,4}(?:-[A-Z0-9]{1,4})?\b/g, // 9448-7434, 5520-8145-A3
  /\b\d{2}-\d{4}-\d{4}\b/g, // 70-1620-0114
  /\b[A-Z]{1,2}\d{7,10}\b/g, // N55308511
  /\b\d{10}\b/g, // Metso 10-digit
];

const csvEsc = (s) => `"${String(s).replace(/"/g, '""').replace(/\s+/g, ' ').trim()}"`;
const rows = ['source_pdf,page,pn_candidate,context'];

for (const file of fs.readdirSync(pdfDir).filter((f) => f.toLowerCase().endsWith('.pdf'))) {
  const buf = fs.readFileSync(path.join(pdfDir, file));
  let pages = [];
  try {
    // Collect text per page via pagerender hook
    await pdfParse(buf, {
      pagerender: async (pageData) => {
        const tc = await pageData.getTextContent();
        const text = tc.items.map((i) => i.str).join(' ');
        pages.push(text);
        return text;
      },
    });
  } catch (err) {
    console.error(`PARSE FAILED: ${file}: ${err.message}`);
    continue;
  }
  fs.writeFileSync(
    path.join(outDir, 'text', `${file}.txt`),
    pages.map((p, i) => `\n===== PAGE ${i + 1} =====\n${p}`).join('\n'),
  );

  let count = 0;
  pages.forEach((text, i) => {
    const seenOnPage = new Set();
    for (const pattern of PN_PATTERNS) {
      for (const m of text.matchAll(pattern)) {
        const pn = m[0];
        if (seenOnPage.has(pn)) continue;
        seenOnPage.add(pn);
        const start = Math.max(0, m.index - 70);
        const context = text.slice(start, m.index + pn.length + 70);
        rows.push([csvEsc(file), i + 1, csvEsc(pn), csvEsc(context)].join(','));
        count++;
      }
    }
  });
  console.log(`${file}: ${pages.length} pages, ${count} candidate rows`);
}

fs.writeFileSync(path.join(outDir, 'candidates.csv'), rows.join('\n'));
console.log(`wrote ${rows.length - 1} candidates -> ${path.join(outDir, 'candidates.csv')}`);
