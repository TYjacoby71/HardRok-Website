// Adapter selection by env CRM_PROVIDER (SPEC.md §8). Default = webhook.
import type { CrmAdapter } from './types';
import { webhookAdapter } from './webhook';
import { hubspotAdapter } from './hubspot';
import { zohoAdapter } from './zoho';
import { pipedriveAdapter } from './pipedrive';

export { SkipCrmSync } from './webhook';
export type { CrmAdapter } from './types';

const adapters: Record<string, CrmAdapter> = {
  webhook: webhookAdapter,
  hubspot: hubspotAdapter,
  zoho: zohoAdapter,
  pipedrive: pipedriveAdapter,
};

export function crmAdapter(): CrmAdapter {
  const provider = (process.env.CRM_PROVIDER ?? 'webhook').toLowerCase();
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(`Unknown CRM_PROVIDER "${provider}" — expected one of ${Object.keys(adapters).join(', ')}`);
  }
  return adapter;
}
