/** Server-only helpers shared by /api/adventure/start and /complete. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Completion } from './progress';

/** HMAC secret for attempt tokens. The service-role key is always set where these routes can write. */
export function attemptSecret(): string {
  return process.env.ADVENTURE_ATTEMPT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export const ADVENTURE_LANGS = new Set(['en', 'he', 'sv', 'es', 'ja', 'ru']);
export const adventureLang = (lang: unknown) =>
  typeof lang === 'string' && ADVENTURE_LANGS.has(lang) ? lang : 'en';

export async function loadCompletions(db: SupabaseClient, userId: string): Promise<Completion[]> {
  const { data, error } = await db
    .from('level_completions')
    .select('world, level, stars')
    .eq('user_id', userId);
  if (error) throw new Error(`level_completions read failed: ${error.message}`);
  return (data ?? []) as Completion[];
}
