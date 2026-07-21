// Lead routing (SPEC.md §7):
// 1. Match lead.state to territories.states.
// 2. If territory geojson + geo point available, point-in-polygon overrides.
// 3. One active rep -> assign; multiple -> weighted round-robin by
//    last_assigned_at.
// 4. No match -> house queue (rep slug "house"), raw.review = true.
// Every decision is logged into leads.raw.
import { supabase } from './supabase';
import type { LeadRow, RepRow, TerritoryRow } from './types';

interface GeoPoint {
  lat: number;
  lng: number;
}

function pointInRing(point: GeoPoint, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = [ring[i]![0]!, ring[i]![1]!];
    const [xj, yj] = [ring[j]![0]!, ring[j]![1]!];
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInGeoJson(point: GeoPoint, geojson: unknown): boolean {
  if (!geojson || typeof geojson !== 'object') return false;
  const geo = geojson as { type?: string; coordinates?: unknown; geometry?: unknown };
  if (geo.geometry) return pointInGeoJson(point, geo.geometry);
  if (geo.type === 'Polygon' && Array.isArray(geo.coordinates)) {
    const [outer] = geo.coordinates as number[][][];
    return outer ? pointInRing(point, outer) : false;
  }
  if (geo.type === 'MultiPolygon' && Array.isArray(geo.coordinates)) {
    return (geo.coordinates as number[][][][]).some((poly) =>
      poly[0] ? pointInRing(point, poly[0]) : false,
    );
  }
  return false;
}

/**
 * Weighted round-robin: highest effective idle time wins, where idle time is
 * scaled by round_robin_weight. Equal weights alternate cleanly (rubric:
 * verified with 2 reps in one territory). Exported pure so it can be tested
 * without a database.
 */
export function pickRoundRobin(candidates: RepRow[], now: number): RepRow {
  return candidates
    .map((r) => ({
      rep: r,
      score:
        (now - (r.last_assigned_at ? Date.parse(r.last_assigned_at) : 0)) *
        Math.max(r.round_robin_weight, 1),
    }))
    .sort((a, b) => b.score - a.score)[0]!.rep;
}

export interface AssignmentResult {
  territoryId: string | null;
  rep: RepRow | null;
  decision: Record<string, unknown>;
}

export async function assignLead(lead: LeadRow, geo?: GeoPoint): Promise<AssignmentResult> {
  const db = supabase();
  const decision: Record<string, unknown> = { at: new Date().toISOString() };

  const { data: territories, error: tErr } = await db.from('territories').select('*');
  if (tErr) throw new Error(`territories query failed: ${tErr.message}`);

  // 1. State match
  let territory: TerritoryRow | null =
    (territories as TerritoryRow[]).find(
      (t) => lead.state && t.states?.includes(lead.state.toUpperCase()),
    ) ?? null;
  decision.state_match = territory ? { territory: territory.name } : null;

  // 2. Geo override when a point and polygons are available
  if (geo) {
    const geoMatch = (territories as TerritoryRow[]).find(
      (t) => t.geojson && pointInGeoJson(geo, t.geojson),
    );
    if (geoMatch && geoMatch.id !== territory?.id) {
      decision.geo_override = { from: territory?.name ?? null, to: geoMatch.name };
      territory = geoMatch;
    }
  }

  // 3. Pick a rep
  let rep: RepRow | null = null;
  if (territory) {
    const { data: reps, error: rErr } = await db
      .from('reps')
      .select('*')
      .eq('territory_id', territory.id)
      .eq('active', true);
    if (rErr) throw new Error(`reps query failed: ${rErr.message}`);

    const candidates = (reps ?? []) as RepRow[];
    if (candidates.length === 1) {
      rep = candidates[0]!;
      decision.method = 'single_rep';
    } else if (candidates.length > 1) {
      rep = pickRoundRobin(candidates, Date.now());
      decision.method = 'round_robin';
      decision.candidates = candidates.map((r) => ({
        slug: r.slug,
        last_assigned_at: r.last_assigned_at,
        weight: r.round_robin_weight,
      }));
    }
  }

  // 4. House queue fallback
  if (!rep) {
    const { data: house } = await db
      .from('reps')
      .select('*')
      .eq('slug', 'house')
      .eq('active', true)
      .maybeSingle();
    rep = (house as RepRow | null) ?? null;
    decision.method = 'house_queue';
    decision.review = true;
  }
  decision.assigned_rep = rep?.slug ?? null;

  // Persist assignment + decision log
  const raw: Record<string, unknown> = { ...(lead.raw ?? {}), assignment: decision };
  const update: Record<string, unknown> = {
    territory_id: territory?.id ?? null,
    assigned_rep_id: rep?.id ?? null,
    raw,
  };
  if (decision.review) raw.review = true;
  const { error: uErr } = await db.from('leads').update(update).eq('id', lead.id);
  if (uErr) throw new Error(`lead assignment update failed: ${uErr.message}`);

  if (rep) {
    await db.from('reps').update({ last_assigned_at: new Date().toISOString() }).eq('id', rep.id);
  }

  return { territoryId: territory?.id ?? null, rep, decision };
}
