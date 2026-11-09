/**
 * Decide what the multiplayer hub Ranked CTA should do.
 *
 * Never a blind isAdmin flip: eligibility (`canPlayRanked`) and the PostHog
 * kill-switch both gate join. Guests get an auth prompt — not a silent hide.
 */
export type RankedCtaAction = 'hidden' | 'auth' | 'locked' | 'join';

export function resolveRankedCta({
  flagOn,
  isAuthenticated,
  canPlayRanked,
}: {
  flagOn: boolean;
  isAuthenticated: boolean;
  canPlayRanked: boolean;
}): RankedCtaAction {
  if (!flagOn) return 'hidden';
  if (!isAuthenticated) return 'auth';
  if (!canPlayRanked) return 'locked';
  return 'join';
}
