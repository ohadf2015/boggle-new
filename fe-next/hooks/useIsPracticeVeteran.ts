/**
 * useIsPracticeVeteran
 *
 * Returns true once a player has "graduated" from the practice / single-player
 * onboarding affordances. Veterans see the streamlined Quick Play UX; newcomers
 * see the practice-emphasized landing.
 *
 * Sources of truth (in priority order):
 *   1. Signed-in user — server-set `profile.practice_graduated_at` (authoritative).
 *   2. Signed-in user — `profile.total_words >= 20` (fallback before backfill / for
 *      profiles fetched with a column-narrow select).
 *   3. Guest user — localStorage `GuestStats.words >= 20`.
 *
 * Once the server flag flips, it never regresses — the column is set ONCE in
 * the data layer (see `playerStats.ts` and the `practice_graduated_at` migration).
 */

import { useAuth } from '@/contexts/AuthContext';
import { getGuestStats } from '@/utils/guestManager';

const PRACTICE_GRADUATION_WORDS = 20;

export function useIsPracticeVeteran(): boolean {
  const { profile } = useAuth();

  if (profile) {
    if (profile.practice_graduated_at) return true;
    return (profile.total_words ?? 0) >= PRACTICE_GRADUATION_WORDS;
  }

  // Guest path — localStorage only. SSR returns false (no veteran UX before hydration).
  if (typeof window === 'undefined') return false;
  const stats = getGuestStats();
  return (stats?.words ?? 0) >= PRACTICE_GRADUATION_WORDS;
}
