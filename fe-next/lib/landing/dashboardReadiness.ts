/**
 * Dashboard hydration-readiness helpers.
 *
 * Keep side-effect-free + framework-free so they're unit-testable and shared by
 * the home surfaces (top bar profile, daily hero) that must shield the view
 * during the profile/challenge hydration gap.
 */

import type { ProfileData } from '@/contexts/auth/authTypes';
import type { User } from '@supabase/supabase-js';

/**
 * Should the dashboard treat the player's profile as still loading?
 *
 * The auth `loading` flag alone is insufficient: on cold-start the initial
 * session resolves (`loading` → false) and `user` is set, but `profile` is
 * fetched separately and lands 1–3s later. Rendering during that window paints
 * the guest "Player" default, which then snaps to the real username — the
 * reported flicker.
 *
 * Rule: keep loading TRUE until the profile actually resolves for a signed-in
 * session, while a guest (no `user`) is never "loading" — they get the neutral
 * state immediately instead of an endless skeleton.
 *
 * @param authLoading - `loading` from the auth context (session still resolving)
 * @param user        - the authenticated session user, or null for a guest
 * @param profile     - the resolved profile row, or null while it is in flight
 */
export function isDashboardProfileLoading(
  authLoading: boolean,
  user: User | null,
  profile: ProfileData | null,
): boolean {
  if (authLoading) return true;
  // Signed-in session whose profile row hasn't arrived yet → still pessimistic.
  return !!user && !profile;
}
