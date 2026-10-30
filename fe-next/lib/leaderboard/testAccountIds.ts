import type { SupabaseClient } from '@supabase/supabase-js';

const LOOKUP_CAP_MS = 1_000;

/**
 * Every QA account id (a partial index covers `is_test_account`, and there are only dozens).
 * Null when the lookup fails or outlives the cap, so callers fail open and keep every row.
 */
export async function fetchTestAccountIds(client: SupabaseClient): Promise<string[] | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const lookup = await Promise.race([
    Promise.resolve(client.from('profiles').select('id').eq('is_test_account', true)),
    new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), LOOKUP_CAP_MS); }),
  ]).catch(() => null).finally(() => clearTimeout(timer));
  if (!lookup || lookup.error) return null;
  return ((lookup.data ?? []) as Array<{ id: string }>).map(p => p.id);
}
