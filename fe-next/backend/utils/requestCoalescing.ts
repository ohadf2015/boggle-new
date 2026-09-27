/**
 * Request Coalescing Utility
 *
 * Prevents duplicate concurrent requests to the same resource by coalescing them.
 * When multiple requests come in for the same key simultaneously, only one
 * actual fetch is made and all waiters receive the same result.
 *
 * Benefits:
 * - Reduces database/API load during traffic spikes
 * - Prevents thundering herd problems when cache expires
 * - Improves response times for coalesced requests
 */

import logger from './logger';

// ==========================================
// Type Definitions
// ==========================================

interface CoalesceStats {
  totalRequests: number;
  coalescedRequests: number;
  actualFetches: number;
}

interface CoalesceStatsResult extends CoalesceStats {
  pendingRequests: number;
  coalescingRatio: string;
}

interface CoalesceOptions {
  maxWaitMs?: number;
}

type FetchFunction<T> = () => Promise<T>;
type CoalescerFunction<T> = (keySuffix: string, fetchFn: FetchFunction<T>, options?: CoalesceOptions) => Promise<T>;

// ==========================================
// State
// ==========================================

/**
 * In-flight request tracker
 * Maps keys to promises that resolve when the request completes
 */
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Statistics for monitoring
 */
const stats: CoalesceStats = {
  totalRequests: 0,
  coalescedRequests: 0,
  actualFetches: 0,
};

// ==========================================
// Core Functions
// ==========================================

/**
 * Coalesce multiple concurrent requests into a single fetch
 *
 * @example
 * // Multiple concurrent calls will only make one actual fetch:
 * const result = await coalesce('leaderboard:top100', async () => {
 *   return await supabase.from('leaderboard').select('*').limit(100);
 * });
 */
export async function coalesce<T>(key: string, fetchFn: FetchFunction<T>, _options: CoalesceOptions = {}): Promise<T> {
  stats.totalRequests++;

  // Check if there's already a pending request for this key
  if (pendingRequests.has(key)) {
    stats.coalescedRequests++;
    logger.debug('COALESCE', `Request coalesced for key: ${key}`);

    // Return the existing promise - this caller will receive the same result
    return pendingRequests.get(key) as Promise<T>;
  }

  // No pending request - we need to make the actual fetch
  stats.actualFetches++;

  // Create a promise that will be shared among all concurrent requests
  const fetchPromise = (async (): Promise<T> => {
    try {
      const result = await fetchFn();
      return result;
    } finally {
      // Clean up the pending request after completion (success or failure)
      pendingRequests.delete(key);
    }
  })();

  // Store the promise so concurrent requests can reuse it
  pendingRequests.set(key, fetchPromise);

  return fetchPromise;
}

/**
 * Coalesce with timeout - useful for requests that might hang
 */
export async function coalesceWithTimeout<T>(key: string, fetchFn: FetchFunction<T>, timeoutMs: number = 5000): Promise<T> {
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    setTimeout(() => reject(new Error(`Request timeout for key: ${key}`)), timeoutMs);
  });

  return Promise.race([
    coalesce(key, fetchFn),
    timeoutPromise
  ]);
}

/**
 * Get coalescing statistics
 */
export function getStats(): CoalesceStatsResult {
  return {
    ...stats,
    pendingRequests: pendingRequests.size,
    coalescingRatio: stats.totalRequests > 0
      ? (stats.coalescedRequests / stats.totalRequests * 100).toFixed(2) + '%'
      : '0%'
  };
}

/**
 * Reset statistics (for testing)
 */
export function resetStats(): void {
  stats.totalRequests = 0;
  stats.coalescedRequests = 0;
  stats.actualFetches = 0;
}

/**
 * Clear all pending requests (for shutdown)
 */
export function clearPending(): void {
  pendingRequests.clear();
}

/**
 * Create a coalescing wrapper for a specific key pattern
 *
 * @example
 * const leaderboardCoalesce = createCoalescer('leaderboard');
 * const result = await leaderboardCoalesce('top100', () => fetchTop100());
 */
export function createCoalescer<T>(keyPrefix: string): CoalescerFunction<T> {
  return (keySuffix: string, fetchFn: FetchFunction<T>, options: CoalesceOptions = {}): Promise<T> => {
    const fullKey = `${keyPrefix}:${keySuffix}`;
    return coalesce(fullKey, fetchFn, options);
  };
}

export type { CoalesceStats, CoalesceStatsResult, CoalesceOptions, FetchFunction, CoalescerFunction };
