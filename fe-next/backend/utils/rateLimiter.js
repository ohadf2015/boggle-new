// Rate limiter utility for WebSocket connections

class RateLimiter {
  constructor(maxMessages = 50, windowMs = 10000) {
    this.maxMessages = maxMessages;
    this.windowMs = windowMs;
    this.clients = new Map();
  }

  /**
   * Initialize rate limiting for a client
   * @param {string} clientId - Unique client identifier
   */
  initClient(clientId) {
    this.clients.set(clientId, {
      messageCount: 0,
      resetTime: Date.now() + this.windowMs
    });
  }

  /**
   * Check if a client has exceeded the rate limit
   * @param {string} clientId - Client identifier
   * @returns {boolean} - True if rate limit exceeded, false otherwise
   */
  isRateLimited(clientId, weight = 1) {
    const client = this.clients.get(clientId);

    if (!client) {
      // Client not initialized, allow and initialize
      this.initClient(clientId);
      return false;
    }

    const now = Date.now();

    // Reset if window has expired
    if (now > client.resetTime) {
      client.messageCount = 0;
      client.resetTime = now + this.windowMs;
    }

    // Increment and check
    client.messageCount += weight;

    if (client.messageCount > this.maxMessages) {
      console.warn(`[RATE_LIMIT] Client ${clientId} exceeded limit (${client.messageCount}/${this.maxMessages})`);
      return true;
    }

    return false;
  }

  /**
   * Remove a client from rate limiting
   * @param {string} clientId - Client identifier to remove
   */
  removeClient(clientId) {
    this.clients.delete(clientId);
  }

  /**
   * Get current stats for a client
   * @param {string} clientId - Client identifier
   * @returns {Object|null} - Client stats or null if not found
   */
  getClientStats(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return null;

    const now = Date.now();
    const timeRemaining = Math.max(0, client.resetTime - now);

    return {
      messageCount: client.messageCount,
      maxMessages: this.maxMessages,
      timeRemaining,
      isLimited: client.messageCount >= this.maxMessages
    };
  }

  /**
   * Get total number of tracked clients
   * @returns {number}
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Clear all rate limiting data
   */
  clear() {
    this.clients.clear();
  }
}

// Create a singleton instance for use across the application
// Increased defaults: 150 messages per 10 seconds is more reasonable for real gameplay
// (ping/pong, join, ack, word submissions, leaderboard requests all count)
const maxMessages = parseInt(process.env.RATE_MAX_MESSAGES || '150');
const windowMs = parseInt(process.env.RATE_WINDOW_MS || '10000');
const rateLimiterInstance = new RateLimiter(maxMessages, windowMs);

/**
 * Check if a client is allowed to proceed (not rate limited)
 * @param {string} clientId - Client identifier
 * @returns {boolean} - True if allowed, false if rate limited
 */
function checkRateLimit(clientId, weight = 1) {
  return !rateLimiterInstance.isRateLimited(clientId, weight);
}

/**
 * Reset/remove rate limiting for a client (e.g., on disconnect)
 * @param {string} clientId - Client identifier
 */
function resetRateLimit(clientId) {
  rateLimiterInstance.removeClient(clientId);
}

module.exports = {
  RateLimiter,
  rateLimiterInstance,
  checkRateLimit,
  resetRateLimit
};
