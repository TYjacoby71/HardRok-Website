export type LeadSource = 'quote_form' | 'product_form' | 'sms' | 'landing_page';

export interface LeadInsert {
  source: LeadSource;
  source_page?: string | null;
  name?: string | null;
  phone: string;
  email?: string | null;
  company?: string | null;
  state?: string | null;
  category?: string | null;
  machine?: string | null;
  message?: string | null;
  attachment_url?: string | null;
  raw?: Record<string, unknown>;
}

export interface LeadRow extends LeadInsert {
  id: string;
  created_at: string;
  territory_id: string | null;
  assigned_rep_id: string | null;
  crm_status: 'pending' | 'synced' | 'failed';
  crm_external_id: string | null;
  raw: Record<string, unknown>;
}

export interface RepRow {
  id: string;
  name: string | null;
  slug: string | null;
  phone: string | null;
  email: string | null;
  territory_id: string | null;
  calendar_url: string | null;
  active: boolean;
  round_robin_weight: number;
  last_assigned_at: string | null;
}

export interface TerritoryRow {
  id: string;
  name: string | null;
  states: string[] | null;
  geojson: unknown;
}
