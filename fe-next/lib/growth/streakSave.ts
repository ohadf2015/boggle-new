/**
 * Eligibility for the solo-results streak-save ask (StreakSaveLink).
 *
 * Lives outside the component so the results screens can decide whether
 * anything will render — a parent that wraps a null-rendering child in
 * `RevealIn` leaves an empty div in a `space-y-4` column — without pulling the
 * lazily-loaded link (and the signup card behind it) into the eager bundle.
 */

/** Below this a streak isn't worth insuring, so the screen asks nothing. */
export const STREAK_SAVE_MIN_STREAK = 2;

interface StreakSaveEligibility {
  isAuthenticated: boolean;
  /** Streak as the surface counts it — win streak on solo, days in practice. */
  streak: number;
  /** False while the streak is still resolving: ask nothing, never a flash. */
  isStreakLoaded?: boolean;
}

export const canOfferStreakSave = ({
  isAuthenticated,
  streak,
  isStreakLoaded = true,
}: StreakSaveEligibility): boolean =>
  !isAuthenticated && isStreakLoaded && streak >= STREAK_SAVE_MIN_STREAK;
