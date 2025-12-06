/**
 * API Rate Limiter - Express Middleware
 *
 * Provides rate limiting for REST API endpoints using a sliding window algorithm.
 * Supports configurable limits per endpoint, IP-based tracking, and automatic cleanup.
 *
 * Usage:
 *   const { apiRateLimiter, createEndpointLimiter } = require('./apiRateLimiter');
 *
 *   // Apply global rate limiting to all API routes
 *   app.use('/api', apiRateLimiter());
 *
 *   // Apply custom limits to specific endpoints
 *   app.get('/api/sensitive', createEndpointLimiter({ maxRequests: 10, windowMs: 60000 }), handler);
 */

const logger = require('./logger');

// ==========================================
// Configuration
// ==========================================

const DEFAULT_CONFIG = {
  maxRequests: 100,           // Max requests per window
  windowMs: 60000,            // Window size in ms (1 minute)
  blockDurationMs: 300000,    // Block duration (5 minutes)
  skipFailedRequests: false,  // Count failed requests
  keyGenerator: null,         // Custom key generator function
  skip: null,                 // Function to skip rate limiting
  onLimitReached: null,       // Callback when limit is reached
  standardHeaders: true,      // Send RateLimit-* headers
  legacyHeaders: false,       // Send X-RateLimit-* headers
  message: {
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: null,         // Will be set dynamically
  },
};

// Endpoint-specific default configurations
const ENDPOINT_CONFIGS = {
  // Public endpoints - more permissive
  '/api/leaderboard': { maxRequests: 60, windowMs: 60000 },
  '/api/geolocation': { maxRequests: 30, windowMs: 60000 },

  // Health checks - very permissive (for monitoring)
  '/health': { maxRequests: 300, windowMs: 60000 },
  '/metrics': { maxRequests: 120, windowMs: 60000 },

  // Analytics - moderate limits
  '/api/analytics': { maxRequests: 100, windowMs: 60000 },

  // Admin endpoints - stricter limits
  '/api/admin': { maxRequests: 30, windowMs: 60000 },
};

// ==========================================
// IP Extraction
// ==========================================

/**
 * Extract client IP from request
 * Handles proxies, load balancers, and direct connections
 * @param {Request} req - Express request
 * @returns {string} - Client IP address
 */
function getClientIp(req) {
  // Trust proxy headers (configured in Express)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips[0]) return ips[0];
  }

  // Cloudflare
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return cfIp;

  // Nginx
  const realIp = req.headers['x-real-ip'];
  if (realIp) return realIp;

  // Direct connection
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// ==========================================
// Rate Limiter Store
// ==========================================

class ApiRateLimiterStore {
  constructor() {
    this.clients = new Map();      // key -> { count, resetTime, lastRequest }
    this.blocked = new Map();      // ip -> blockExpiry

    // Cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => this._cleanup(), 120000);
  }

  /**
   * Get or create rate limit data for a key
   * @param {string} key - Rate limit key (e.g., IP:endpoint)
   * @param {number} windowMs - Window duration
   * @returns {Object} - Rate limit data
   */
  get(key, windowMs) {
    const now = Date.now();
    let data = this.clients.get(key);

    if (!data || now > data.resetTime) {
      data = {
        count: 0,
        resetTime: now + windowMs,
        lastRequest: now,
      };
      this.clients.set(key, data);
    }

    return data;
  }

  /**
   * Increment request count for a key
   * @param {string} key - Rate limit key
   * @param {number} windowMs - Window duration
   * @returns {Object} - Updated rate limit data
   */
  increment(key, windowMs) {
    const data = this.get(key, windowMs);
    data.count++;
    data.lastRequest = Date.now();
    return data;
  }

  /**
   * Check if an IP is blocked
   * @param {string} ip - IP address
   * @returns {boolean}
   */
  isBlocked(ip) {
    const expiry = this.blocked.get(ip);
    if (!expiry) return false;

    if (Date.now() > expiry) {
      this.blocked.delete(ip);
      return false;
    }
    return true;
  }

  /**
   * Block an IP address
   * @param {string} ip - IP address
   * @param {number} durationMs - Block duration
   */
  block(ip, durationMs) {
    this.blocked.set(ip, Date.now() + durationMs);
    logger.warn('API_RATE_LIMIT', `Blocked IP ${ip} for ${Math.round(durationMs / 1000)}s`);
  }

  /**
   * Get remaining time until window reset
   * @param {string} key - Rate limit key
   * @returns {number} - Milliseconds until reset
   */
  getResetTime(key) {
    const data = this.clients.get(key);
    if (!data) return 0;
    return Math.max(0, data.resetTime - Date.now());
  }

  /**
   * Clean up stale entries
   * @private
   */
  _cleanup() {
    const now = Date.now();
    const staleThreshold = 10 * 60 * 1000; // 10 minutes

    // Cleanup client entries
    for (const [key, data] of this.clients) {
      if (now - data.lastRequest > staleThreshold) {
        this.clients.delete(key);
      }
    }

    // Cleanup expired blocks
    for (const [ip, expiry] of this.blocked) {
      if (now > expiry) {
        this.blocked.delete(ip);
      }
    }
  }

  /**
   * Get store statistics
   * @returns {Object}
   */
  getStats() {
    return {
      trackedClients: this.clients.size,
      blockedIps: this.blocked.size,
    };
  }

  /**
   * Shutdown the store
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton store instance
const store = new ApiRateLimiterStore();

// ==========================================
// Middleware Factory
// ==========================================

/**
 * Create API rate limiting middleware
 * @param {Object} options - Configuration options
 * @returns {Function} - Express middleware
 */
function apiRateLimiter(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  return (req, res, next) => {
    // Check if should skip this request
    if (config.skip && config.skip(req)) {
      return next();
    }

    const ip = getClientIp(req);

    // Check if IP is blocked
    if (store.isBlocked(ip)) {
      const resetTime = store.blocked.get(ip) - Date.now();
      return sendRateLimitResponse(res, config, Math.ceil(resetTime / 1000), 'IP temporarily blocked');
    }

    // Generate rate limit key
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : `${ip}:${req.path}`;

    // Get endpoint-specific config if available
    const endpointPath = Object.keys(ENDPOINT_CONFIGS).find(p => req.path.startsWith(p));
    const endpointConfig = endpointPath ? ENDPOINT_CONFIGS[endpointPath] : {};
    const effectiveMaxRequests = endpointConfig.maxRequests || config.maxRequests;
    const effectiveWindowMs = endpointConfig.windowMs || config.windowMs;

    // Increment and check limit
    const data = store.increment(key, effectiveWindowMs);
    const remaining = Math.max(0, effectiveMaxRequests - data.count);
    const resetTime = Math.ceil(store.getResetTime(key) / 1000);

    // Set rate limit headers
    if (config.standardHeaders) {
      res.setHeader('RateLimit-Limit', effectiveMaxRequests);
      res.setHeader('RateLimit-Remaining', remaining);
      res.setHeader('RateLimit-Reset', Math.ceil(data.resetTime / 1000));
    }

    if (config.legacyHeaders) {
      res.setHeader('X-RateLimit-Limit', effectiveMaxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000));
    }

    // Check if limit exceeded
    if (data.count > effectiveMaxRequests) {
      logger.warn('API_RATE_LIMIT', `Rate limit exceeded for ${key} (${data.count}/${effectiveMaxRequests})`);

      // Block IP if significantly over limit (abuse detection)
      if (data.count > effectiveMaxRequests * 2) {
        store.block(ip, config.blockDurationMs);
      }

      // Callback for custom handling
      if (config.onLimitReached) {
        config.onLimitReached(req, res);
      }

      return sendRateLimitResponse(res, config, resetTime);
    }

    next();
  };
}

/**
 * Send rate limit exceeded response
 * @param {Response} res - Express response
 * @param {Object} config - Rate limiter config
 * @param {number} retryAfter - Seconds until retry allowed
 * @param {string} message - Custom message
 */
function sendRateLimitResponse(res, config, retryAfter, message = null) {
  res.setHeader('Retry-After', retryAfter);

  return res.status(429).json({
    error: message || config.message.error,
    code: config.message.code,
    retryAfter,
  });
}

/**
 * Create a rate limiter for a specific endpoint with custom limits
 * @param {Object} options - Endpoint-specific options
 * @returns {Function} - Express middleware
 */
function createEndpointLimiter(options = {}) {
  return apiRateLimiter(options);
}

/**
 * Create a strict rate limiter for sensitive operations
 * @param {Object} options - Override options
 * @returns {Function} - Express middleware
 */
function strictRateLimiter(options = {}) {
  return apiRateLimiter({
    maxRequests: 10,
    windowMs: 60000,
    blockDurationMs: 600000, // 10 minutes
    ...options,
  });
}

/**
 * Create a rate limiter for authentication endpoints
 * @param {Object} options - Override options
 * @returns {Function} - Express middleware
 */
function authRateLimiter(options = {}) {
  return apiRateLimiter({
    maxRequests: 5,
    windowMs: 60000,        // 5 attempts per minute
    blockDurationMs: 900000, // 15 minute block
    keyGenerator: (req) => {
      // Rate limit by IP + username/email if provided
      const ip = getClientIp(req);
      const identifier = req.body?.email || req.body?.username || '';
      return `auth:${ip}:${identifier}`;
    },
    ...options,
  });
}

/**
 * Get rate limiter statistics
 * @returns {Object}
 */
function getApiRateLimitStats() {
  return {
    ...store.getStats(),
    endpointConfigs: ENDPOINT_CONFIGS,
  };
}

/**
 * Check if an IP is blocked
 * @param {string} ip - IP address
 * @returns {boolean}
 */
function isApiIpBlocked(ip) {
  return store.isBlocked(ip);
}

/**
 * Manually block an IP
 * @param {string} ip - IP address
 * @param {number} durationMs - Block duration
 */
function blockApiIp(ip, durationMs = DEFAULT_CONFIG.blockDurationMs) {
  store.block(ip, durationMs);
}

/**
 * Shutdown the rate limiter store
 */
function shutdownApiRateLimiter() {
  store.shutdown();
}

// ==========================================
// Module Exports
// ==========================================

module.exports = {
  // Main middleware
  apiRateLimiter,
  createEndpointLimiter,
  strictRateLimiter,
  authRateLimiter,

  // Utilities
  getClientIp,
  getApiRateLimitStats,
  isApiIpBlocked,
  blockApiIp,
  shutdownApiRateLimiter,

  // Store access (for testing)
  _store: store,

  // Default config export (for documentation)
  DEFAULT_CONFIG,
  ENDPOINT_CONFIGS,
};
