/**
 * Decide what the multiplayer hub Ranked *queue* CTA should do.
 *
 * Progress / league / MMR surfaces are independent — they stay visible even
 * when this returns `hidden`. The PostHog flag defaults to off; the server
 * also requires RANKED_MATCHMAKING_ENABLED=true before joinMatchmaking works.
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
