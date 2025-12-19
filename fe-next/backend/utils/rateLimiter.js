/**
 * Enhanced Rate Limiter with IP-based tracking
 * Provides protection against reconnection bypass attacks by tracking both IP and socket ID
 */

const logger = require('./logger');

/**
 * Sliding window rate limiter with multi-key support
 * Tracks rate limits by IP address, socket ID, and combined keys
 */
class RateLimiter {
  constructor(options = {}) {
    this.maxMessages = options.maxMessages || 150;
    this.windowMs = options.windowMs || 10000;
    this.ipMaxMessages = options.ipMaxMessages || 500; // Higher limit for IP (multiple users behind NAT)
    this.ipWindowMs = options.ipWindowMs || 10000;
    this.blockDurationMs = options.blockDurationMs || 60000; // 1 minute block after exceeding limit

    // Separate tracking for different identifiers
    this.socketClients = new Map();  // Socket ID -> rate data
    this.ipClients = new Map();      // IP address -> rate data
    this.blockedIps = new Map();     // IP address -> block expiry timestamp

    // Cleanup stale entries every minute
    this.cleanupInterval = setInterval(() => this._cleanup(), 60000);
  }

  /**
   * Extract client IP from socket handshake
   * Handles X-Forwarded-For, X-Real-IP, and direct connection
   * @param {Socket} socket - Socket.IO socket instance
   * @returns {string} - Client IP address
   */
  static getClientIp(socket) {
    if (!socket || !socket.handshake) return 'unknown';

    const headers = socket.handshake.headers || {};

    // Check X-Forwarded-For (may contain multiple IPs)
    const forwardedFor = headers['x-forwarded-for'];
    if (forwardedFor) {
      // Take the first IP (original client)
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      if (ips[0]) return ips[0];
    }

    // Check X-Real-IP (nginx/reverse proxy)
    const realIp = headers['x-real-ip'];
    if (realIp) return realIp;

    // Check CF-Connecting-IP (Cloudflare)
    const cfIp = headers['cf-connecting-ip'];
    if (cfIp) return cfIp;

    // Fall back to direct socket address
    return socket.handshake.address || 'unknown';
  }

  /**
   * Initialize rate limiting for a socket with IP tracking
   * @param {string} socketId - Socket ID
   * @param {string} ip - Client IP address
   */
  initClient(socketId, ip = 'unknown') {
    const now = Date.now();

    this.socketClients.set(socketId, {
      ip,
      messageCount: 0,
      resetTime: now + this.windowMs,
      lastActivity: now
    });

    // Initialize or update IP tracking
    if (!this.ipClients.has(ip)) {
      this.ipClients.set(ip, {
        socketIds: new Set([socketId]),
        messageCount: 0,
        resetTime: now + this.ipWindowMs,
        lastActivity: now
      });
    } else {
      const ipData = this.ipClients.get(ip);
      ipData.socketIds.add(socketId);
      ipData.lastActivity = now;
    }
  }

  /**
   * Check if IP is currently blocked
   * @param {string} ip - IP address
   * @returns {boolean} - True if blocked
   */
  isIpBlocked(ip) {
    const blockExpiry = this.blockedIps.get(ip);
    if (!blockExpiry) return false;

    if (Date.now() > blockExpiry) {
      this.blockedIps.delete(ip);
      return false;
    }
    return true;
  }

  /**
   * Block an IP address temporarily
   * @param {string} ip - IP address to block
   * @param {number} durationMs - Block duration (default: blockDurationMs)
   */
  blockIp(ip, durationMs = this.blockDurationMs) {
    this.blockedIps.set(ip, Date.now() + durationMs);
    logger.warn('RATE_LIMIT', `IP ${ip} blocked for ${durationMs}ms`);
  }

  /**
   * Check if a client has exceeded the rate limit
   * @param {string} socketId - Socket ID
   * @param {number} weight - Message weight (default: 1)
   * @returns {Object} - { limited: boolean, reason?: string }
   */
  isRateLimited(socketId, weight = 1) {
    const socketData = this.socketClients.get(socketId);

    if (!socketData) {
      // Client not initialized, allow and initialize with unknown IP
      this.initClient(socketId, 'unknown');
      return { limited: false };
    }

    const ip = socketData.ip;
    const now = Date.now();

    // Check if IP is blocked
    if (this.isIpBlocked(ip)) {
      return { limited: true, reason: 'ip_blocked' };
    }

    // Check socket-level rate limit
    if (now > socketData.resetTime) {
      socketData.messageCount = 0;
      socketData.resetTime = now + this.windowMs;
    }

    socketData.messageCount += weight;
    socketData.lastActivity = now;

    if (socketData.messageCount > this.maxMessages) {
      logger.warn('RATE_LIMIT', `Socket ${socketId} (IP: ${ip}) exceeded limit (${socketData.messageCount}/${this.maxMessages})`);
      return { limited: true, reason: 'socket_limit' };
    }

    // Check IP-level rate limit
    const ipData = this.ipClients.get(ip);
    if (ipData) {
      if (now > ipData.resetTime) {
        ipData.messageCount = 0;
        ipData.resetTime = now + this.ipWindowMs;
      }

      ipData.messageCount += weight;
      ipData.lastActivity = now;

      if (ipData.messageCount > this.ipMaxMessages) {
        logger.warn('RATE_LIMIT', `IP ${ip} exceeded limit (${ipData.messageCount}/${this.ipMaxMessages}) - blocking`);
        this.blockIp(ip);
        return { limited: true, reason: 'ip_limit' };
      }
    }

    return { limited: false };
  }

  /**
   * Remove a client from rate limiting (on disconnect)
   * @param {string} socketId - Socket ID to remove
   */
  removeClient(socketId) {
    const socketData = this.socketClients.get(socketId);
    if (!socketData) return;

    const ip = socketData.ip;
    this.socketClients.delete(socketId);

    // Update IP tracking
    const ipData = this.ipClients.get(ip);
    if (ipData) {
      ipData.socketIds.delete(socketId);
      // Remove IP entry if no more sockets from this IP
      if (ipData.socketIds.size === 0) {
        this.ipClients.delete(ip);
      }
    }
  }

  /**
   * Get current stats for a client
   * @param {string} socketId - Socket ID
   * @returns {Object|null} - Client stats or null if not found
   */
  getClientStats(socketId) {
    const socketData = this.socketClients.get(socketId);
    if (!socketData) return null;

    const now = Date.now();
    const timeRemaining = Math.max(0, socketData.resetTime - now);
    const ipData = this.ipClients.get(socketData.ip);

    return {
      socketId,
      ip: socketData.ip,
      messageCount: socketData.messageCount,
      maxMessages: this.maxMessages,
      timeRemaining,
      isLimited: socketData.messageCount >= this.maxMessages,
      ipMessageCount: ipData?.messageCount || 0,
      ipMaxMessages: this.ipMaxMessages,
      isIpBlocked: this.isIpBlocked(socketData.ip)
    };
  }

  /**
   * Get aggregate statistics
   * @returns {Object} - Aggregate stats
   */
  getStats() {
    return {
      trackedSockets: this.socketClients.size,
      trackedIps: this.ipClients.size,
      blockedIps: this.blockedIps.size,
      config: {
        maxMessages: this.maxMessages,
        windowMs: this.windowMs,
        ipMaxMessages: this.ipMaxMessages,
        blockDurationMs: this.blockDurationMs
      }
    };
  }

  /**
   * Cleanup stale entries to prevent memory leaks
   * @private
   */
  _cleanup() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    // Cleanup stale socket entries
    for (const [socketId, data] of this.socketClients) {
      if (now - data.lastActivity > staleThreshold) {
        this.removeClient(socketId);
      }
    }

    // Cleanup expired IP blocks
    for (const [ip, expiry] of this.blockedIps) {
      if (now > expiry) {
        this.blockedIps.delete(ip);
      }
    }
  }

  /**
   * Shutdown the rate limiter (clear intervals)
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all rate limiting data
   */
  clear() {
    this.socketClients.clear();
    this.ipClients.clear();
    this.blockedIps.clear();
  }

  // Legacy method for backwards compatibility
  getClientCount() {
    return this.socketClients.size;
  }
}

// Create singleton instance with configurable options
const maxMessages = parseInt(process.env.RATE_MAX_MESSAGES || '150');
const windowMs = parseInt(process.env.RATE_WINDOW_MS || '10000');
const ipMaxMessages = parseInt(process.env.RATE_IP_MAX_MESSAGES || '500');
const blockDurationMs = parseInt(process.env.RATE_BLOCK_DURATION_MS || '60000');

const rateLimiterInstance = new RateLimiter({
  maxMessages,
  windowMs,
  ipMaxMessages,
  blockDurationMs
});

/**
 * Initialize rate limiting for a socket connection
 * Should be called when a socket connects
 * @param {Socket} socket - Socket.IO socket instance
 */
function initRateLimit(socket) {
  const ip = RateLimiter.getClientIp(socket);
  rateLimiterInstance.initClient(socket.id, ip);
}

/**
 * Check if a client is allowed to proceed (not rate limited)
 * @param {string} socketId - Socket ID
 * @param {number} weight - Message weight (default: 1)
 * @returns {boolean} - True if allowed, false if rate limited
 */
function checkRateLimit(socketId, weight = 1) {
  const result = rateLimiterInstance.isRateLimited(socketId, weight);
  return !result.limited;
}

/**
 * Check rate limit with detailed result
 * @param {string} socketId - Socket ID
 * @param {number} weight - Message weight (default: 1)
 * @returns {Object} - { allowed: boolean, reason?: string }
 */
function checkRateLimitDetailed(socketId, weight = 1) {
  const result = rateLimiterInstance.isRateLimited(socketId, weight);
  return { allowed: !result.limited, reason: result.reason };
}

/**
 * Reset/remove rate limiting for a client (e.g., on disconnect)
 * @param {string} socketId - Socket ID
 */
function resetRateLimit(socketId) {
  rateLimiterInstance.removeClient(socketId);
}

/**
 * Check if an IP is currently blocked
 * @param {string} ip - IP address
 * @returns {boolean}
 */
function isIpBlocked(ip) {
  return rateLimiterInstance.isIpBlocked(ip);
}

/**
 * Get rate limiter statistics
 * @returns {Object}
 */
function getRateLimitStats() {
  return rateLimiterInstance.getStats();
}

module.exports = {
  RateLimiter,
  rateLimiterInstance,
  initRateLimit,
  checkRateLimit,
  checkRateLimitDetailed,
  resetRateLimit,
  isIpBlocked,
  getRateLimitStats
};
