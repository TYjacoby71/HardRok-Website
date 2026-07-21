import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// Server-side client, bypasses RLS. Never expose this key to the browser.
// New Supabase projects issue sb_secret_... keys (SUPABASE_SECRET_KEY);
// legacy projects issue service_role JWTs (SUPABASE_SERVICE_ROLE_KEY).
// Either works — same privileges, same client.
export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set');
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export const ATTACHMENTS_BUCKET = 'lead-attachments';

export async function uploadAttachment(
  path: string,
  bytes: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<string | null> {
  const db = supabase();
  const { error } = await db.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
  // Long-lived signed URL so reps/CRM can open the photo from the lead record.
  const { data, error: signErr } = await db.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) return path; // fall back to the storage path
  return data?.signedUrl ?? path;
}
