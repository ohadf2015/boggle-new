/**
 * Known analytics-rig user ids. Stored as UUID prefixes because the PostHog
 * person id and the Supabase user id share that prefix.
 *
 * Writers must skip these the same way readers do. A readout that excludes
 * them while the writer still emits is not an exclusion.
 */
export const ANALYTICS_TEST_USER_PREFIXES = ['14f10c13', '1f0715b5'] as const;

export function isAnalyticsTestUserId(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return ANALYTICS_TEST_USER_PREFIXES.some((prefix) => userId.startsWith(prefix));
}
