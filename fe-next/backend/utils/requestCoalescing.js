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

const logger = require('./logger');

/**
 * In-flight request tracker
 * Maps keys to promises that resolve when the request completes
 */
const pendingRequests = new Map();

/**
 * Statistics for monitoring
 */
const stats = {
  totalRequests: 0,
  coalescedRequests: 0,
  actualFetches: 0,
};

/**
 * Coalesce multiple concurrent requests into a single fetch
 *
 * @param {string} key - Unique key identifying the resource
 * @param {Function} fetchFn - Async function that fetches the resource
 * @param {Object} options - Configuration options
 * @param {number} options.maxWaitMs - Maximum time to wait for coalescing (default: 100ms)
 * @returns {Promise<any>} The fetched result
 *
 * @example
 * // Multiple concurrent calls will only make one actual fetch:
 * const result = await coalesce('leaderboard:top100', async () => {
 *   return await supabase.from('leaderboard').select('*').limit(100);
 * });
 */
async function coalesce(key, fetchFn, options = {}) {
  stats.totalRequests++;

  // Check if there's already a pending request for this key
  if (pendingRequests.has(key)) {
    stats.coalescedRequests++;
    logger.debug('COALESCE', `Request coalesced for key: ${key}`);

    // Return the existing promise - this caller will receive the same result
    return pendingRequests.get(key);
  }

  // No pending request - we need to make the actual fetch
  stats.actualFetches++;

  // Create a promise that will be shared among all concurrent requests
  const fetchPromise = (async () => {
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
 *
 * @param {string} key - Unique key identifying the resource
 * @param {Function} fetchFn - Async function that fetches the resource
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<any>} The fetched result or throws on timeout
 */
async function coalesceWithTimeout(key, fetchFn, timeoutMs = 5000) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout for key: ${key}`)), timeoutMs);
  });

  return Promise.race([
    coalesce(key, fetchFn),
    timeoutPromise
  ]);
}

/**
 * Get coalescing statistics
 * @returns {Object} Stats object
 */
function getStats() {
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
function resetStats() {
  stats.totalRequests = 0;
  stats.coalescedRequests = 0;
  stats.actualFetches = 0;
}

/**
 * Clear all pending requests (for shutdown)
 */
function clearPending() {
  pendingRequests.clear();
}

/**
 * Create a coalescing wrapper for a specific key pattern
 *
 * @param {string} keyPrefix - Prefix for generating keys
 * @returns {Function} Wrapped coalesce function
 *
 * @example
 * const leaderboardCoalesce = createCoalescer('leaderboard');
 * const result = await leaderboardCoalesce('top100', () => fetchTop100());
 */
function createCoalescer(keyPrefix) {
  return (keySuffix, fetchFn, options = {}) => {
    const fullKey = `${keyPrefix}:${keySuffix}`;
    return coalesce(fullKey, fetchFn, options);
  };
}

module.exports = {
  coalesce,
  coalesceWithTimeout,
  createCoalescer,
  getStats,
  resetStats,
  clearPending,
};
