// STUB (SPEC.md §8). TODO: implement when the client confirms HubSpot as the
// CRM vendor (TODO.md Part 2E). Throwing keeps leads safe: they persist in
// Supabase with crm_status='failed' and retry every 15 minutes.
import type { CrmAdapter } from './types';

const notImplemented = () => {
  throw new Error('HubSpot adapter not implemented — set CRM_PROVIDER=webhook or finish this stub');
};

export const hubspotAdapter: CrmAdapter = {
  async createLead() {
    return notImplemented();
  },
  async assignOwner() {
    return notImplemented();
  },
  async addNote() {
    return notImplemented();
  },
};
