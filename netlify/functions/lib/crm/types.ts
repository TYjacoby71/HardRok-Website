import type { LeadRow } from '../types';

// CRM adapter interface (SPEC.md §8). The vendor is unknown — nothing outside
// this directory may reference a specific CRM.
export interface CrmAdapter {
  createLead(lead: LeadRow): Promise<{ externalId: string | null }>;
  assignOwner(externalId: string, repMap: { repSlug: string; repEmail?: string }): Promise<void>;
  addNote(externalId: string, note: string): Promise<void>;
}
