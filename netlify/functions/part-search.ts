// Master part-number search: GET ?q=<number> resolves against the
// build-generated map (scripts/generate-search-index.mjs) and 302s to the
// number's page — individual part page, else its brand/model index page,
// else the friendly not-found page. Plain GET + redirect so the header
// search form works with JavaScript disabled (SPEC §3).
// Every search is logged to part_searches: live demand data for which
// numbers people actually hunt.
import type { Handler } from '@netlify/functions';
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { supabase } from './lib/supabase';

let map: Record<string, string> | null = null;

function loadMap(): Record<string, string> {
  if (map) return map;
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
  for (const r of roots) {
    for (const c of [path.join(r, 'data', 'part-search-map.json.gz'), path.join(r, 'netlify', 'functions', 'data', 'part-search-map.json.gz')]) {
      if (existsSync(c)) {
        map = JSON.parse(gunzipSync(readFileSync(c)).toString('utf8'));
        return map!;
      }
    }
  }
  throw new Error('part-search-map.json.gz not bundled');
}

export const handler: Handler = async (event) => {
  const raw = (event.queryStringParameters?.q ?? '').trim().slice(0, 80);
  if (!raw) return { statusCode: 302, headers: { Location: '/', 'Cache-Control': 'no-store' }, body: '' };

  const normalized = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let target = '';
  try {
    target = normalized ? (loadMap()[normalized] ?? '') : '';
  } catch (err) {
    console.error('part-search map load failed:', err);
  }
  const location = target || `/parts/not-found/?q=${encodeURIComponent(raw)}`;

  // Demand logging is best-effort — never delay or fail the redirect.
  try {
    await supabase().from('part_searches').insert({
      query: raw,
      normalized,
      matched_url: target || null,
    });
  } catch (err) {
    console.error('part-search logging failed:', err);
  }

  return { statusCode: 302, headers: { Location: location, 'Cache-Control': 'no-store' }, body: '' };
};
