/** Server-only helpers shared by /api/adventure/start and /complete. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Completion } from './progress';
import { sortedDict, type PrefixDict } from './deal';
import { loadDictionarySet } from '@/lib/server/dictionarySet';
import { isRussianWord, hasRussianPrefix } from '@/lib/server/russianWordLookup';

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

const prefixDicts = new Map<string, PrefixDict>();

/**
 * Prefix-searchable dictionary for the board solver (hints + hunt targets).
 * Russian binary-searches its word file; the rest sort the shared word set once
 * (the sorted array shares the Set's strings, so the extra heap is one pointer array).
 */
export async function loadPrefixDict(language: string): Promise<PrefixDict | null> {
  if (language === 'ru') return { has: isRussianWord, hasPrefix: hasRussianPrefix };
  const cached = prefixDicts.get(language);
  if (cached) return cached;
  const set = await loadDictionarySet(language);
  if (!set.size) return null;
  const dict = sortedDict(set);
  prefixDicts.set(language, dict);
  return dict;
}
