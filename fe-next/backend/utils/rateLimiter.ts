/**
 * Unified Rate Limiter
 *
 * Core sliding-window rate limiter that supports:
 * - Socket.IO connections (IP + socket ID tracking)
 * - Express HTTP requests (IP + path tracking)
 *
 * Consolidates common logic: IP extraction, sliding window, blocking, cleanup.
 */

import type { Socket } from 'socket.io';
import type { Request, Response, NextFunction } from 'express';
import logger from './logger';
import {
  isIpBlockedRedis,
  blockIpRedis,
  checkRateLimitRedis,
  RATE_LIMIT_KEYS,
} from '../redis/rateLimit';

// ==========================================
// Type Definitions
// ==========================================

interface RateLimiterCoreOptions {
  maxRequests: number;
  windowMs: number;
  ipMaxRequests?: number;
  ipWindowMs?: number;
  blockDurationMs: number;
  cleanupIntervalMs?: number;
}

interface RateLimitData {
  count: number;
  resetTime: number;
  lastActivity: number;
}

interface IpRateData extends RateLimitData {
  keys: Set<string>;
}

interface RateLimitResult {
  limited: boolean;
  reason?: 'ip_blocked' | 'key_limit' | 'ip_limit';
  remaining?: number;
  resetTime?: number;
}

interface RateLimiterStats {
  trackedKeys: number;
  trackedIps: number;
  blockedIps: number;
  config: {
    maxRequests: number;
    windowMs: number;
    ipMaxRequests: number;
    blockDurationMs: number;
  };
}

// ==========================================
// IP Extraction Utilities
// ==========================================

type HeaderValue = string | string[] | undefined;

function extractFirstIp(value: HeaderValue): string | null {
  if (!value) return null;
  const str = Array.isArray(value) ? value[0] : value;
  const ips = str.split(',').map(ip => ip.trim());
  return ips[0] || null;
}

/**
 * Extract client IP from Socket.IO handshake headers
 */
export function getIpFromSocket(socket: Socket): string {
  if (!socket?.handshake) return 'unknown';

  const headers = socket.handshake.headers || {};

  // X-Forwarded-For (may contain multiple IPs, take first)
  const forwardedFor = extractFirstIp(headers['x-forwarded-for']);
  if (forwardedFor) return forwardedFor;

  // X-Real-IP (nginx/reverse proxy)
  const realIp = extractFirstIp(headers['x-real-ip']);
  if (realIp) return realIp;

  // CF-Connecting-IP (Cloudflare)
  const cfIp = extractFirstIp(headers['cf-connecting-ip']);
  if (cfIp) return cfIp;

  return socket.handshake.address || 'unknown';
}

/**
 * Extract client IP from Express request headers
 */
export function getIpFromRequest(req: Request): string {
  const headers = req.headers || {};

  // X-Forwarded-For
  const forwardedFor = extractFirstIp(headers['x-forwarded-for']);
  if (forwardedFor) return forwardedFor;

  // CF-Connecting-IP (Cloudflare)
  const cfIp = extractFirstIp(headers['cf-connecting-ip']);
  if (cfIp) return cfIp;

  // X-Real-IP (nginx)
  const realIp = extractFirstIp(headers['x-real-ip']);
  if (realIp) return realIp;

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// ==========================================
// Core Rate Limiter Class
// ==========================================

/**
 * Core sliding-window rate limiter with IP blocking
 * Used internally by both Socket and API rate limiters
 */
export class RateLimiterCore {
  private maxRequests: number;
  private windowMs: number;
  private ipMaxRequests: number;
  private ipWindowMs: number;
  private blockDurationMs: number;

  private keyData: Map<string, RateLimitData>;
  private ipData: Map<string, IpRateData>;
  private blockedIps: Map<string, number>;
  private cleanupInterval: ReturnType<typeof setInterval> | null;

  constructor(options: RateLimiterCoreOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
    this.ipMaxRequests = options.ipMaxRequests ?? options.maxRequests * 30;
    this.ipWindowMs = options.ipWindowMs ?? options.windowMs;
    this.blockDurationMs = options.blockDurationMs;

    this.keyData = new Map();
    this.ipData = new Map();
    this.blockedIps = new Map();

    const cleanupMs = options.cleanupIntervalMs ?? 60000;
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupMs);
    this.cleanupInterval.unref();
  }

  /**
   * Register a key with its associated IP
   */
  registerKey(key: string, ip: string): void {
    const now = Date.now();

    this.keyData.set(key, {
      count: 0,
      resetTime: now + this.windowMs,
      lastActivity: now,
    });

    if (!this.ipData.has(ip)) {
      this.ipData.set(ip, {
        keys: new Set([key]),
        count: 0,
        resetTime: now + this.ipWindowMs,
        lastActivity: now,
      });
    } else {
      const data = this.ipData.get(ip)!;
      data.keys.add(key);
      data.lastActivity = now;
    }
  }

  /**
   * Unregister a key (e.g., on disconnect)
   */
  unregisterKey(key: string, ip: string): void {
    this.keyData.delete(key);

    const ipInfo = this.ipData.get(ip);
    if (ipInfo) {
      ipInfo.keys.delete(key);
      if (ipInfo.keys.size === 0) {
        this.ipData.delete(ip);
      }
    }
  }

  /**
   * Check if an IP is currently blocked
   */
  isIpBlocked(ip: string): boolean {
    const expiry = this.blockedIps.get(ip);
    if (!expiry) return false;

    if (Date.now() > expiry) {
      this.blockedIps.delete(ip);
      return false;
    }
    return true;
  }

  /**
   * Block an IP for a duration
   */
  blockIp(ip: string, durationMs: number = this.blockDurationMs): void {
    this.blockedIps.set(ip, Date.now() + durationMs);
    logger.warn('RATE_LIMIT', `IP ${ip} blocked for ${Math.round(durationMs / 1000)}s`);
  }

  /**
   * Check rate limit for a key+IP combination
   */
  checkLimit(key: string, ip: string, weight: number = 1): RateLimitResult {
    const now = Date.now();

    // Check IP block first
    if (this.isIpBlocked(ip)) {
      return { limited: true, reason: 'ip_blocked' };
    }

    // Get or create key data
    let kData = this.keyData.get(key);
    if (!kData) {
      this.registerKey(key, ip);
      kData = this.keyData.get(key)!;
    }

    // Reset window if expired
    if (now > kData.resetTime) {
      kData.count = 0;
      kData.resetTime = now + this.windowMs;
    }

    kData.count += weight;
    kData.lastActivity = now;

    // Check key limit
    if (kData.count > this.maxRequests) {
      logger.warn('RATE_LIMIT', `Key ${key} (IP: ${ip}) exceeded limit (${kData.count}/${this.maxRequests})`);
      return {
        limited: true,
        reason: 'key_limit',
        remaining: 0,
        resetTime: kData.resetTime,
      };
    }

    // Check IP limit
    const ipInfo = this.ipData.get(ip);
    if (ipInfo) {
      if (now > ipInfo.resetTime) {
        ipInfo.count = 0;
        ipInfo.resetTime = now + this.ipWindowMs;
      }

      ipInfo.count += weight;
      ipInfo.lastActivity = now;

      if (ipInfo.count > this.ipMaxRequests) {
        logger.warn('RATE_LIMIT', `IP ${ip} exceeded limit (${ipInfo.count}/${this.ipMaxRequests}) - blocking`);
        this.blockIp(ip);
        return { limited: true, reason: 'ip_limit' };
      }
    }

    return {
      limited: false,
      remaining: Math.max(0, this.maxRequests - kData.count),
      resetTime: kData.resetTime,
    };
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string): { remaining: number; resetTime: number } {
    const data = this.keyData.get(key);
    if (!data) return { remaining: this.maxRequests, resetTime: Date.now() + this.windowMs };
    return {
      remaining: Math.max(0, this.maxRequests - data.count),
      resetTime: data.resetTime,
    };
  }

  /**
   * Get statistics
   */
  getStats(): RateLimiterStats {
    return {
      trackedKeys: this.keyData.size,
      trackedIps: this.ipData.size,
      blockedIps: this.blockedIps.size,
      config: {
        maxRequests: this.maxRequests,
        windowMs: this.windowMs,
        ipMaxRequests: this.ipMaxRequests,
        blockDurationMs: this.blockDurationMs,
      },
    };
  }

  /**
   * Cleanup stale entries
   */
  private cleanup(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000;

    for (const [key, data] of this.keyData) {
      if (now - data.lastActivity > staleThreshold) {
        this.keyData.delete(key);
      }
    }

    for (const [ip, data] of this.ipData) {
      if (now - data.lastActivity > staleThreshold && data.keys.size === 0) {
        this.ipData.delete(ip);
      }
    }

    for (const [ip, expiry] of this.blockedIps) {
      if (now > expiry) {
        this.blockedIps.delete(ip);
      }
    }
  }

  /**
   * Shutdown cleanup interval
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.keyData.clear();
    this.ipData.clear();
    this.blockedIps.clear();
  }
}

// ==========================================
// Socket.IO Rate Limiter (Legacy API Compatible)
// ==========================================

interface SocketRateLimiterOptions {
  maxMessages?: number;
  windowMs?: number;
  ipMaxMessages?: number;
  ipWindowMs?: number;
  blockDurationMs?: number;
}

interface SocketClientStats {
  socketId: string;
  ip: string;
  messageCount: number;
  maxMessages: number;
  timeRemaining: number;
  isLimited: boolean;
  ipMessageCount: number;
  ipMaxMessages: number;
  isIpBlocked: boolean;
}

interface SocketRateLimiterStats {
  trackedSockets: number;
  trackedIps: number;
  blockedIps: number;
  config: {
    maxMessages: number;
    windowMs: number;
    ipMaxMessages: number;
    blockDurationMs: number;
  };
}

/**
 * Socket.IO rate limiter - maintains full backward compatibility
 */
export class RateLimiter {
  private core: RateLimiterCore;
  private socketIpMap: Map<string, string>;

  maxMessages: number;
  windowMs: number;
  ipMaxMessages: number;
  ipWindowMs: number;
  blockDurationMs: number;

  // Legacy properties for backward compatibility
  socketClients: Map<string, { ip: string; messageCount: number; resetTime: number; lastActivity: number }>;
  ipClients: Map<string, { socketIds: Set<string>; messageCount: number; resetTime: number; lastActivity: number }>;
  blockedIps: Map<string, number>;
  cleanupInterval: ReturnType<typeof setInterval> | null;

  constructor(options: SocketRateLimiterOptions = {}) {
    this.maxMessages = options.maxMessages ?? 150;
    this.windowMs = options.windowMs ?? 10000;
    this.ipMaxMessages = options.ipMaxMessages ?? 4500;
    this.ipWindowMs = options.ipWindowMs ?? 10000;
    this.blockDurationMs = options.blockDurationMs ?? 60000;

    this.core = new RateLimiterCore({
      maxRequests: this.maxMessages,
      windowMs: this.windowMs,
      ipMaxRequests: this.ipMaxMessages,
      ipWindowMs: this.ipWindowMs,
      blockDurationMs: this.blockDurationMs,
    });

    this.socketIpMap = new Map();

    // Legacy compatibility - expose internal maps (read-only usage)
    this.socketClients = new Map();
    this.ipClients = new Map();
    this.blockedIps = new Map();
    this.cleanupInterval = null;
  }

  /**
   * Extract client IP from socket handshake (static for external use)
   */
  static getClientIp(socket: Socket): string {
    return getIpFromSocket(socket);
  }

  /**
   * Initialize rate limiting for a socket
   */
  initClient(socketId: string, ip: string = 'unknown'): void {
    this.socketIpMap.set(socketId, ip);
    this.core.registerKey(socketId, ip);
  }

  /**
   * Check if IP is blocked
   */
  isIpBlocked(ip: string): boolean {
    return this.core.isIpBlocked(ip);
  }

  /**
   * Block an IP
   */
  blockIp(ip: string, durationMs: number = this.blockDurationMs): void {
    this.core.blockIp(ip, durationMs);
  }

  /**
   * Check rate limit for a socket
   */
  isRateLimited(socketId: string, weight: number = 1): { limited: boolean; reason?: 'ip_blocked' | 'socket_limit' | 'ip_limit' } {
    let ip = this.socketIpMap.get(socketId);
    if (!ip) {
      ip = 'unknown';
      this.initClient(socketId, ip);
    }

    const result = this.core.checkLimit(socketId, ip, weight);

    // Map reason for backward compatibility
    let reason: 'ip_blocked' | 'socket_limit' | 'ip_limit' | undefined;
    if (result.reason === 'key_limit') {
      reason = 'socket_limit';
    } else if (result.reason) {
      reason = result.reason;
    }

    return { limited: result.limited, reason };
  }

  /**
   * Remove a client
   */
  removeClient(socketId: string): void {
    const ip = this.socketIpMap.get(socketId) || 'unknown';
    this.core.unregisterKey(socketId, ip);
    this.socketIpMap.delete(socketId);
  }

  /**
   * Get client stats
   */
  getClientStats(socketId: string): SocketClientStats | null {
    const ip = this.socketIpMap.get(socketId);
    if (!ip) return null;

    const { remaining, resetTime } = this.core.getRemaining(socketId);
    const coreStats = this.core.getStats();

    return {
      socketId,
      ip,
      messageCount: this.maxMessages - remaining,
      maxMessages: this.maxMessages,
      timeRemaining: Math.max(0, resetTime - Date.now()),
      isLimited: remaining === 0,
      ipMessageCount: 0, // Not tracked separately in core
      ipMaxMessages: this.ipMaxMessages,
      isIpBlocked: this.core.isIpBlocked(ip),
    };
  }

  /**
   * Get aggregate stats
   */
  getStats(): SocketRateLimiterStats {
    const coreStats = this.core.getStats();
    return {
      trackedSockets: coreStats.trackedKeys,
      trackedIps: coreStats.trackedIps,
      blockedIps: coreStats.blockedIps,
      config: {
        maxMessages: this.maxMessages,
        windowMs: this.windowMs,
        ipMaxMessages: this.ipMaxMessages,
        blockDurationMs: this.blockDurationMs,
      },
    };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    this.core.shutdown();
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.core.clear();
    this.socketIpMap.clear();
  }

  /**
   * Legacy method
   */
  getClientCount(): number {
    return this.socketIpMap.size;
  }
}

// ==========================================
// API Rate Limiter (Express Middleware)
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

    // Get endpoint-specific config
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

// ==========================================
// Socket Rate Limiter Singleton & Exports
// ==========================================

const maxMessages = parseInt(process.env.RATE_MAX_MESSAGES || '150');
const windowMs = parseInt(process.env.RATE_WINDOW_MS || '10000');
const ipMaxMessages = parseInt(process.env.RATE_IP_MAX_MESSAGES || '4500');
const blockDurationMs = parseInt(process.env.RATE_BLOCK_DURATION_MS || '60000');

export const rateLimiterInstance = new RateLimiter({
  maxMessages,
  windowMs,
  ipMaxMessages,
  blockDurationMs,
});

/**
 * Initialize rate limiting for a socket connection
 */
export function initRateLimit(socket: Socket): void {
  const ip = RateLimiter.getClientIp(socket);
  rateLimiterInstance.initClient(socket.id, ip);
}

/**
 * Check if a client is allowed to proceed
 */
export function checkRateLimit(socketId: string, weight: number = 1): boolean {
  const result = rateLimiterInstance.isRateLimited(socketId, weight);
  return !result.limited;
}

/**
 * Check rate limit with detailed result
 */
export function checkRateLimitDetailed(socketId: string, weight: number = 1): { allowed: boolean; reason?: string } {
  const result = rateLimiterInstance.isRateLimited(socketId, weight);
  return { allowed: !result.limited, reason: result.reason };
}

/**
 * Reset rate limiting for a client
 */
export function resetRateLimit(socketId: string): void {
  rateLimiterInstance.removeClient(socketId);
}

/**
 * Check if an IP is blocked (socket rate limiter)
 */
export function isIpBlocked(ip: string): boolean {
  return rateLimiterInstance.isIpBlocked(ip);
}

/**
 * Get socket rate limiter stats
 */
export function getRateLimitStats(): SocketRateLimiterStats {
  return rateLimiterInstance.getStats();
}

// ==========================================
// Redis-Backed Rate Limiting (Distributed)
// ==========================================

/**
 * Check if IP is blocked (async, checks Redis first)
 * Use this at connection time for distributed IP blocking
 */
export async function isIpBlockedAsync(ip: string): Promise<boolean> {
  // Check in-memory first (instant response)
  if (rateLimiterInstance.isIpBlocked(ip)) {
    return true;
  }

  // Check Redis for distributed blocking
  const redisBlocked = await isIpBlockedRedis(ip);
  if (redisBlocked) {
    // Sync to in-memory cache
    rateLimiterInstance.blockIp(ip);
    return true;
  }

  return false;
}

/**
 * Block IP (async, stores in both Redis and in-memory)
 * Use this for distributed IP blocking across all server instances
 */
export async function blockIpAsync(ip: string, durationMs?: number): Promise<void> {
  const duration = durationMs ?? rateLimiterInstance.blockDurationMs;

  // Block in-memory (immediate effect for this instance)
  rateLimiterInstance.blockIp(ip, duration);

  // Block in Redis (distributed effect across all instances)
  await blockIpRedis(ip, duration);
}

/**
 * Check rate limit with optional Redis backend (async)
 * Use this for critical rate limiting that needs distributed state
 *
 * @param key - Unique key (e.g., socket ID, IP:path)
 * @param ip - Client IP address
 * @param options - Rate limit options
 */
export async function checkRateLimitAsync(
  key: string,
  ip: string,
  options: { maxRequests: number; windowMs: number; weight?: number }
): Promise<{ allowed: boolean; reason?: string; remaining: number }> {
  // Check IP block first
  if (await isIpBlockedAsync(ip)) {
    return { allowed: false, reason: 'ip_blocked', remaining: 0 };
  }

  // Use Redis for distributed rate limiting
  const redisKey = RATE_LIMIT_KEYS.socket(key);
  const result = await checkRateLimitRedis(redisKey, {
    maxRequests: options.maxRequests,
    windowMs: options.windowMs,
    weight: options.weight ?? 1,
  });

  return {
    allowed: !result.limited,
    reason: result.reason,
    remaining: result.remaining,
  };
}

export default rateLimiterInstance;
