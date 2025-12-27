/**
 * API Rate Limiter - Express Middleware
 *
 * Provides rate limiting for REST API endpoints using a sliding window algorithm.
 * Supports configurable limits per endpoint, IP-based tracking, and automatic cleanup.
 *
 * Usage:
 *   import { apiRateLimiter, createEndpointLimiter } from './apiRateLimiter';
 *
 *   // Apply global rate limiting to all API routes
 *   app.use('/api', apiRateLimiter());
 *
 *   // Apply custom limits to specific endpoints
 *   app.get('/api/sensitive', createEndpointLimiter({ maxRequests: 10, windowMs: 60000 }), handler);
 */

import type { Request, Response, NextFunction } from 'express';
import logger from './logger';

// ==========================================
// Type Definitions
// ==========================================

interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
  skipFailedRequests: boolean;
  keyGenerator: ((req: Request) => string) | null;
  skip: ((req: Request) => boolean) | null;
  onLimitReached: ((req: Request, res: Response) => void) | null;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  message: {
    error: string;
    code: string;
    retryAfter: number | null;
  };
}

interface EndpointConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitData {
  count: number;
  resetTime: number;
  lastRequest: number;
}

interface StoreStats {
  trackedClients: number;
  blockedIps: number;
}

// ==========================================
// Configuration
// ==========================================

export const DEFAULT_CONFIG: RateLimiterConfig = {
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
export const ENDPOINT_CONFIGS: Record<string, EndpointConfig> = {
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
 */
export function getClientIp(req: Request): string {
  // Trust proxy headers (configured in Express)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const forwardedForStr = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const ips = forwardedForStr.split(',').map(ip => ip.trim());
    if (ips[0]) return ips[0];
  }

  // Cloudflare
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return Array.isArray(cfIp) ? cfIp[0] : cfIp;

  // Nginx
  const realIp = req.headers['x-real-ip'];
  if (realIp) return Array.isArray(realIp) ? realIp[0] : realIp;

  // Direct connection
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// ==========================================
// Rate Limiter Store
// ==========================================

class ApiRateLimiterStore {
  clients: Map<string, RateLimitData>;
  blocked: Map<string, number>;
  cleanupInterval: ReturnType<typeof setInterval> | null;

  constructor() {
    this.clients = new Map();      // key -> { count, resetTime, lastRequest }
    this.blocked = new Map();      // ip -> blockExpiry

    // Cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => this._cleanup(), 120000);
  }

  /**
   * Get or create rate limit data for a key
   */
  get(key: string, windowMs: number): RateLimitData {
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
   */
  increment(key: string, windowMs: number): RateLimitData {
    const data = this.get(key, windowMs);
    data.count++;
    data.lastRequest = Date.now();
    return data;
  }

  /**
   * Check if an IP is blocked
   */
  isBlocked(ip: string): boolean {
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
   */
  block(ip: string, durationMs: number): void {
    this.blocked.set(ip, Date.now() + durationMs);
    logger.warn('API_RATE_LIMIT', `Blocked IP ${ip} for ${Math.round(durationMs / 1000)}s`);
  }

  /**
   * Get remaining time until window reset
   */
  getResetTime(key: string): number {
    const data = this.clients.get(key);
    if (!data) return 0;
    return Math.max(0, data.resetTime - Date.now());
  }

  /**
   * Clean up stale entries
   */
  private _cleanup(): void {
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
   */
  getStats(): StoreStats {
    return {
      trackedClients: this.clients.size,
      blockedIps: this.blocked.size,
    };
  }

  /**
   * Shutdown the store
   */
  shutdown(): void {
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
 */
export function apiRateLimiter(options: Partial<RateLimiterConfig> = {}): (req: Request, res: Response, next: NextFunction) => void {
  const config: RateLimiterConfig = { ...DEFAULT_CONFIG, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    // Check if should skip this request
    if (config.skip && config.skip(req)) {
      return next();
    }

    const ip = getClientIp(req);

    // Check if IP is blocked
    if (store.isBlocked(ip)) {
      const blockExpiry = store.blocked.get(ip);
      const resetTime = blockExpiry ? blockExpiry - Date.now() : 0;
      return sendRateLimitResponse(res, config, Math.ceil(resetTime / 1000), 'IP temporarily blocked');
    }

    // Generate rate limit key
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : `${ip}:${req.path}`;

    // Get endpoint-specific config if available
    const endpointPath = Object.keys(ENDPOINT_CONFIGS).find(p => req.path.startsWith(p));
    const endpointConfig: Partial<EndpointConfig> = endpointPath ? ENDPOINT_CONFIGS[endpointPath] : {};
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
 */
function sendRateLimitResponse(res: Response, config: RateLimiterConfig, retryAfter: number, message: string | null = null): void {
  res.setHeader('Retry-After', retryAfter);

  res.status(429).json({
    error: message || config.message.error,
    code: config.message.code,
    retryAfter,
  });
}

/**
 * Create a rate limiter for a specific endpoint with custom limits
 */
export function createEndpointLimiter(options: Partial<RateLimiterConfig> = {}): (req: Request, res: Response, next: NextFunction) => void {
  return apiRateLimiter(options);
}

/**
 * Create a strict rate limiter for sensitive operations
 */
export function strictRateLimiter(options: Partial<RateLimiterConfig> = {}): (req: Request, res: Response, next: NextFunction) => void {
  return apiRateLimiter({
    maxRequests: 10,
    windowMs: 60000,
    blockDurationMs: 600000, // 10 minutes
    ...options,
  });
}

/**
 * Create a rate limiter for authentication endpoints
 */
export function authRateLimiter(options: Partial<RateLimiterConfig> = {}): (req: Request, res: Response, next: NextFunction) => void {
  return apiRateLimiter({
    maxRequests: 5,
    windowMs: 60000,        // 5 attempts per minute
    blockDurationMs: 900000, // 15 minute block
    keyGenerator: (req: Request) => {
      // Rate limit by IP + username/email if provided
      const ip = getClientIp(req);
      const body = req.body as { email?: string; username?: string } | undefined;
      const identifier = body?.email || body?.username || '';
      return `auth:${ip}:${identifier}`;
    },
    ...options,
  });
}

interface ApiRateLimitStats extends StoreStats {
  endpointConfigs: Record<string, EndpointConfig>;
}

/**
 * Get rate limiter statistics
 */
export function getApiRateLimitStats(): ApiRateLimitStats {
  return {
    ...store.getStats(),
    endpointConfigs: ENDPOINT_CONFIGS,
  };
}

/**
 * Check if an IP is blocked
 */
export function isApiIpBlocked(ip: string): boolean {
  return store.isBlocked(ip);
}

/**
 * Manually block an IP
 */
export function blockApiIp(ip: string, durationMs: number = DEFAULT_CONFIG.blockDurationMs): void {
  store.block(ip, durationMs);
}

/**
 * Shutdown the rate limiter store
 */
export function shutdownApiRateLimiter(): void {
  store.shutdown();
}

// Export store for testing
export const _store = store;
