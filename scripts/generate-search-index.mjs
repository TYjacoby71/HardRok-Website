// Build the part-number search map for the part-search Netlify function.
// Walks the generated content (individual part pages + brand/model index
// pages) and emits {NORMALIZED_NUMBER: url} as gzipped JSON, bundled into
// the function via included_files. Runs as part of `npm run build` so the
// map can never drift from the published pages.
//
// Precedence per number: individual page (distributor > dealer > reference)
// beats index page.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
const RANK = { distributor: 3, dealer: 2, reference: 1 };
const map = new Map(); // normalized -> {url, rank}

// Individual part pages
const partsDir = path.join('src', 'content', 'parts');
for (const f of fs.readdirSync(partsDir)) {
  if (!f.endsWith('.md')) continue;
  const src = fs.readFileSync(path.join(partsDir, f), 'utf8');
  if (/^draft:\s*true/m.test(src)) continue;
  const pn = src.match(/^oemNumber:\s*'(.+)'/m)?.[1]?.replace(/''/g, "'");
  const type = src.match(/^pageType:\s*'(\w+)'/m)?.[1] ?? 'reference';
  if (!pn) continue;
  const key = norm(pn);
  const rank = 10 + (RANK[type] ?? 1); // parts pages always beat index pages
  const cur = map.get(key);
  if (!cur || rank > cur.rank) map.set(key, { url: `/parts/${f.replace(/\.md$/, '')}/`, rank });
}

// Brand/model index pages (body lines: "- PN" or "- [PN](/parts/...)")
const idxDir = path.join('src', 'content', 'part-indexes');
for (const f of fs.readdirSync(idxDir)) {
  if (!f.endsWith('.md')) continue;
  const src = fs.readFileSync(path.join(idxDir, f), 'utf8');
  const url = `/part-numbers/${f.replace(/\.md$/, '')}/`;
  for (const m of src.matchAll(/^- (?:\[([^\]]+)\]\([^)]*\)|(.+))$/gm)) {
    const pn = (m[1] ?? m[2] ?? '').trim();
    if (!pn) continue;
    const key = norm(pn);
    if (!map.has(key)) map.set(key, { url, rank: 0 });
  }
}

const out = Object.fromEntries([...map.entries()].map(([k, v]) => [k, v.url]));
const dataDir = path.join('netlify', 'functions', 'data');
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'part-search-map.json.gz'), zlib.gzipSync(JSON.stringify(out), { level: 9 }));
console.log(`search map: ${map.size} numbers -> ${(fs.statSync(path.join(dataDir, 'part-search-map.json.gz')).size / 1024).toFixed(0)} KB`);
