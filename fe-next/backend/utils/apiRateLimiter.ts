/**
 * API Rate Limiter (Express Middleware)
 * Provides rate limiting middleware for Express HTTP routes
 */

import type { Request, Response, NextFunction } from 'express';
import { RateLimiterCore, getIpFromRequest } from './rateLimiter';
import logger from './logger';

// ==========================================
// Configuration
// ==========================================

interface ApiRateLimiterConfig {
  maxRequests?: number;
  windowMs?: number;
  blockDurationMs?: number;
  skipFailedRequests?: boolean;
  keyGenerator?: ((req: Request) => string) | null;
  skip?: ((req: Request) => boolean) | null;
  onLimitReached?: ((req: Request, res: Response) => void) | null;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  message?: {
    error: string;
    code: string;
    retryAfter: number | null;
  };
}

const API_DEFAULT_CONFIG: Required<ApiRateLimiterConfig> = {
  maxRequests: 100,
  windowMs: 60000,
  blockDurationMs: 300000,
  skipFailedRequests: false,
  keyGenerator: null,
  skip: null,
  onLimitReached: null,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: null,
  },
};

// Endpoint-specific configurations
export const ENDPOINT_CONFIGS: Record<string, { maxRequests: number; windowMs: number }> = {
  '/api/leaderboard': { maxRequests: 60, windowMs: 60000 },
  '/api/geolocation': { maxRequests: 30, windowMs: 60000 },
  '/health': { maxRequests: 300, windowMs: 60000 },
  '/metrics': { maxRequests: 120, windowMs: 60000 },
  '/api/analytics': { maxRequests: 100, windowMs: 60000 },
  '/api/admin': { maxRequests: 30, windowMs: 60000 },
};

// Shared API rate limiter store
const apiStore = new RateLimiterCore({
  maxRequests: API_DEFAULT_CONFIG.maxRequests,
  windowMs: API_DEFAULT_CONFIG.windowMs,
  blockDurationMs: API_DEFAULT_CONFIG.blockDurationMs,
  cleanupIntervalMs: 120000,
});

function sendApiRateLimitResponse(res: Response, config: Required<ApiRateLimiterConfig>, retryAfter: number, message?: string): void {
  res.setHeader('Retry-After', retryAfter);
  res.status(429).json({
    error: message || config.message.error,
    code: config.message.code,
    retryAfter,
  });
}

/**
 * Create API rate limiting middleware
 */
export function apiRateLimiter(options: ApiRateLimiterConfig = {}): (req: Request, res: Response, next: NextFunction) => void {
  const config: Required<ApiRateLimiterConfig> = { ...API_DEFAULT_CONFIG, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    if (config.skip && config.skip(req)) {
      return next();
    }

    const ip = getIpFromRequest(req);

    if (apiStore.isIpBlocked(ip)) {
      return sendApiRateLimitResponse(res, config, 60, 'IP temporarily blocked');
    }

    const key = config.keyGenerator ? config.keyGenerator(req) : `${ip}:${req.path}`;

    const endpointPath = Object.keys(ENDPOINT_CONFIGS).find(p => req.path.startsWith(p));
    const endpointConfig = endpointPath ? ENDPOINT_CONFIGS[endpointPath] : null;
    const effectiveMax = endpointConfig?.maxRequests ?? config.maxRequests;

    const result = apiStore.checkLimit(key, ip);
    const resetTime = Math.ceil((result.resetTime ?? Date.now()) / 1000);
    const remaining = result.remaining ?? 0;

    if (config.standardHeaders) {
      res.setHeader('RateLimit-Limit', effectiveMax);
      res.setHeader('RateLimit-Remaining', remaining);
      res.setHeader('RateLimit-Reset', resetTime);
    }

    if (config.legacyHeaders) {
      res.setHeader('X-RateLimit-Limit', effectiveMax);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);
    }

    if (result.limited) {
      logger.warn('API_RATE_LIMIT', `Rate limit exceeded for ${key}`);

      if (config.onLimitReached) {
        config.onLimitReached(req, res);
      }

      const retryAfter = Math.ceil(((result.resetTime ?? Date.now()) - Date.now()) / 1000);
      return sendApiRateLimitResponse(res, config, Math.max(1, retryAfter));
    }

    next();
  };
}

/**
 * Create endpoint-specific rate limiter
 */
export function createEndpointLimiter(options: ApiRateLimiterConfig = {}): (req: Request, res: Response, next: NextFunction) => void {
  return apiRateLimiter(options);
}

/**
 * Strict rate limiter for sensitive operations
 */
export function strictRateLimiter(options: ApiRateLimiterConfig = {}): (req: Request, res: Response, next: NextFunction) => void {
  return apiRateLimiter({
    maxRequests: 10,
    windowMs: 60000,
    blockDurationMs: 600000,
    ...options,
  });
}

/**
 * Auth rate limiter
 */
export function authRateLimiter(options: ApiRateLimiterConfig = {}): (req: Request, res: Response, next: NextFunction) => void {
  return apiRateLimiter({
    maxRequests: 5,
    windowMs: 60000,
    blockDurationMs: 900000,
    keyGenerator: (req: Request) => {
      const ip = getIpFromRequest(req);
      const body = req.body as { email?: string; username?: string } | undefined;
      const identifier = body?.email || body?.username || '';
      return `auth:${ip}:${identifier}`;
    },
    ...options,
  });
}

/**
 * Get API rate limit stats
 */
export function getApiRateLimitStats(): { trackedClients: number; blockedIps: number; endpointConfigs: typeof ENDPOINT_CONFIGS } {
  const stats = apiStore.getStats();
  return {
    trackedClients: stats.trackedKeys,
    blockedIps: stats.blockedIps,
    endpointConfigs: ENDPOINT_CONFIGS,
  };
}

/**
 * Check if API IP is blocked
 */
export function isApiIpBlocked(ip: string): boolean {
  return apiStore.isIpBlocked(ip);
}

/**
 * Block API IP
 */
export function blockApiIp(ip: string, durationMs: number = API_DEFAULT_CONFIG.blockDurationMs): void {
  apiStore.blockIp(ip, durationMs);
}

/**
 * Shutdown API rate limiter
 */
export function shutdownApiRateLimiter(): void {
  apiStore.shutdown();
}

// Export API store for testing
export const _apiStore = apiStore;
