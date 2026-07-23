// TEMPORARY one-shot loader for the parts cross-reference dataset.
// Background function (15-min limit): reads the bundled NDJSON.gz data
// files and loads them into parts_xref / parts_xref_groups using the
// service-role client. Idempotent: clears ONLY those two tables first.
// Remove this function + netlify/functions/data/ once the load is
// verified — it has no runtime role in the site.
import type { Handler } from '@netlify/functions';
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supabase } from './lib/supabase';

function findData(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), 'netlify', 'functions', 'data', name),
    path.join(here, 'data', name),
    path.join(here, '..', 'data', name),
    path.join(here, '..', '..', 'data', name),
    path.join(here, 'netlify', 'functions', 'data', name),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`bundled data file not found: ${name}; tried ${candidates.join(' | ')}`);
}

function readNdjson(name: string): Record<string, unknown>[] {
  const raw = gunzipSync(readFileSync(findData(name))).toString('utf8');
  return raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'POST only' };
  let confirm = '';
  try {
    confirm = JSON.parse(event.body ?? '{}').confirm ?? '';
  } catch {
    /* fall through */
  }
  if (confirm !== 'load-parts-xref') return { statusCode: 400, body: 'missing confirm' };

  const db = supabase();
  const log = (m: string) => console.log(`[ingest-xref] ${m}`);

  const rows = readNdjson('xref_rows.ndjson.gz');
  const groups = readNdjson('xref_groups.ndjson.gz');
  log(`parsed ${rows.length} xref rows, ${groups.length} group rows`);

  // Clear ONLY our two tables (neq filter = "all rows" under PostgREST rules)
  for (const table of ['parts_xref_groups', 'parts_xref']) {
    const { error } = await db.from(table).delete().neq('id', -1);
    if (error) throw new Error(`clearing ${table}: ${error.message}`);
  }
  log('tables cleared');

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from('parts_xref').insert(rows.slice(i, i + BATCH));
    if (error) throw new Error(`parts_xref batch at ${i}: ${error.message}`);
    inserted += Math.min(BATCH, rows.length - i);
    if (inserted % 5000 < BATCH) log(`parts_xref: ${inserted}/${rows.length}`);
  }
  let ginserted = 0;
  for (let i = 0; i < groups.length; i += BATCH) {
    const { error } = await db.from('parts_xref_groups').insert(groups.slice(i, i + BATCH));
    if (error) throw new Error(`parts_xref_groups batch at ${i}: ${error.message}`);
    ginserted += Math.min(BATCH, groups.length - i);
  }
  log(`DONE: parts_xref=${inserted} parts_xref_groups=${ginserted}`);
  return { statusCode: 200, body: JSON.stringify({ inserted, ginserted }) };
};
