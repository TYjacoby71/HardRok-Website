// STUB (SPEC.md §8). TODO: implement when the client confirms Zoho as the CRM
// vendor (TODO.md Part 2E).
import type { CrmAdapter } from './types';

const notImplemented = () => {
  throw new Error('Zoho adapter not implemented — set CRM_PROVIDER=webhook or finish this stub');
};

export const zohoAdapter: CrmAdapter = {
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
