/**
 * Reading OTHER players' profiles.
 *
 * `public.profiles` is SELECT-restricted to the caller's own row, and PostgREST
 * reports that as an empty result with `error: null` — so every cross-player
 * read in the friends module returned zero rows and rendered an empty list with
 * no error anywhere. `public.public_profiles` is the definer-semantics view that
 * exposes the safe subset (no email token, birth year, admin flags or UTM data)
 * to `anon` and `authenticated`.
 *
 * Rule: your OWN row goes through `profiles`; anyone else's goes through here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProfileRow } from './friendsTypes';

export const PUBLIC_PROFILES_TABLE = 'public_profiles';

/** Every column the friends surfaces render for another player. */
export const PUBLIC_PROFILE_COLUMNS =
  'id, username, display_name, avatar_image, avatar_emoji, avatar_color, avatar_config, total_games, ranked_mmr, current_level, last_seen_at';

/**
 * Fetch public profiles by id, keyed for lookup. Returns an empty map (never
 * throws) so a caller renders its rows with fallbacks rather than nothing.
 */
export async function fetchPublicProfiles(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, ProfileRow>> {
  if (ids.length === 0) return new Map();

  const { data } = await supabase
    .from(PUBLIC_PROFILES_TABLE)
    .select(PUBLIC_PROFILE_COLUMNS)
    .in('id', ids);

  return new Map(((data ?? []) as ProfileRow[]).map((p) => [p.id, p]));
}
