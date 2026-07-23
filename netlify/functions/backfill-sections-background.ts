// TEMPORARY one-shot: stage the master-CSV section map into
// xref_section_stage for a SQL-side UPDATE of parts_xref. Same pattern as
// the (already removed) ingest-xref loader: data rides the deploy to where
// the service key lives. Remove after the backfill is verified.
import type { Handler } from '@netlify/functions';
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { supabase } from './lib/supabase';

function findData(name: string): string {
  let here = '';
  try {
    here = typeof __dirname === 'string' ? __dirname : '';
  } catch {
    /* ESM context */
  }
  const roots = [
    process.cwd(),
    path.join(process.cwd(), 'netlify', 'functions'),
    here,
    here && path.join(here, '..'),
    here && path.join(here, '..', '..'),
    '/var/task',
    '/var/task/netlify/functions',
  ].filter(Boolean) as string[];
  const candidates = roots.flatMap((r) => [
    path.join(r, 'data', name),
    path.join(r, 'netlify', 'functions', 'data', name),
    path.join(r, name),
  ]);
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`bundled data file not found: ${name}`);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'POST only' };
  let confirm = '';
  try {
    confirm = JSON.parse(event.body ?? '{}').confirm ?? '';
  } catch {
    /* fall through */
  }
  if (confirm !== 'stage-section-map') return { statusCode: 400, body: 'missing confirm' };

  const db = supabase();
  const log = async (m: string) => {
    console.log(`[backfill-sections] ${m}`);
    try {
      await db.from('ingest_log').insert({ msg: m });
    } catch {
      /* logging must never kill the load */
    }
  };

  try {
    await log('started');
    const raw = gunzipSync(readFileSync(findData('section_map.ndjson.gz'))).toString('utf8');
    const rows = raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
    await log(`parsed ${rows.length} section-map rows`);

    const { error: clearErr } = await db.from('xref_section_stage').delete().neq('id', -1);
    if (clearErr) throw new Error(`clearing stage: ${clearErr.message}`);

    const BATCH = 500;
    let n = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await db.from('xref_section_stage').insert(rows.slice(i, i + BATCH));
      if (error) throw new Error(`stage batch at ${i}: ${error.message}`);
      n += Math.min(BATCH, rows.length - i);
      if (n % 10000 < BATCH) await log(`staged: ${n}/${rows.length}`);
    }
    await log(`DONE: staged ${n} rows`);
    return { statusCode: 200, body: JSON.stringify({ staged: n }) };
  } catch (err) {
    await log(`ERROR: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
    return { statusCode: 500, body: 'failed; see ingest_log' };
  }
};
