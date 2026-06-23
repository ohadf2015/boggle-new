/**
 * Redis cache keys for Next.js app/api caching.
 *
 * The `lc:next:` prefix isolates app-layer caches from the Express backend's
 * `lexiclash:v1:` namespace (both processes share one Redis).
 *
 * RULE: shared (non-per-user) reads use ONE key for every viewer. Any per-user
 * cache MUST embed the userId in the key, or it leaks one user's data to others.
 */
export const cacheKeys = {
  /** Public ranked leaderboard top-50 + profiles — identical for every viewer. */
  rankedTop50: () => 'lc:next:lb:ranked:top50',
  /** League standings for one league — co-member-visible, shared by all members. */
  leagueStandings: (leagueId: string) => `lc:next:lb:league:${leagueId}`,
} as const;
