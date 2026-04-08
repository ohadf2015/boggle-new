/**
 * Unified Rate Limiter
 *
 * Core sliding-window rate limiter that supports:
 * - Socket.IO connections (IP + socket ID tracking)
 * - Express HTTP requests (via apiRateLimiter.ts)
 *
 * Consolidates common logic: IP extraction, sliding window, blocking, cleanup.
 */

import type { Socket } from 'socket.io';
import type { Request } from 'express';
import logger from './logger';
import {
  isIpBlockedRedis,
  blockIpRedis,
  checkRateLimitRedis,
  RATE_LIMIT_KEYS,
} from '../redis/rateLimit';

// NOTE: Do NOT re-export from apiRateLimiter here — it creates a circular dependency
// (apiRateLimiter imports RateLimiterCore from this file).
// Import directly from './apiRateLimiter' instead.

export interface RateLimiterCoreOptions {
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

type HeaderValue = string | string[] | undefined;

/**
 * Extract the rightmost (proxy-appended) IP from a header value.
 * In a proxy chain like "client, proxy1, proxy2", the rightmost IP
 * is the one added by the trusted proxy closest to the server.
 * Using the leftmost (first) IP is insecure — it's client-controlled.
 */
function extractLastIp(value: HeaderValue): string | null {
  if (!value) return null;
  const str = Array.isArray(value) ? value[0] : value;
  const ips = str.split(',').map(ip => ip.trim()).filter(Boolean);
  return ips[ips.length - 1] || null;
}

/**
 * Extract client IP from Socket.IO handshake headers.
 * Prefers socket.handshake.address (TCP-level, set by proxy after trust proxy config),
 * falls back to proxy headers using rightmost IP to prevent spoofing.
 */
export function getIpFromSocket(socket: Socket): string {
  if (!socket?.handshake) return 'unknown';

  // TCP-level address is most reliable when trust proxy is configured
  const directAddr = socket.handshake.address;

  const headers = socket.handshake.headers || {};

  // cf-connecting-ip is trustworthy when Cloudflare is the edge proxy
  const cfIp = extractLastIp(headers['cf-connecting-ip']);
  if (cfIp) return cfIp;

  const forwardedFor = extractLastIp(headers['x-forwarded-for']);
  if (forwardedFor) return forwardedFor;

  const realIp = extractLastIp(headers['x-real-ip']);
  if (realIp) return realIp;

  return directAddr || 'unknown';
}

/**
 * Extract client IP from Express request headers.
 * Uses rightmost IP from X-Forwarded-For to prevent spoofing.
 */
export function getIpFromRequest(req: Request): string {
  const headers = req.headers || {};

  const cfIp = extractLastIp(headers['cf-connecting-ip']);
  if (cfIp) return cfIp;

  const forwardedFor = extractLastIp(headers['x-forwarded-for']);
  if (forwardedFor) return forwardedFor;

  const realIp = extractLastIp(headers['x-real-ip']);
  if (realIp) return realIp;

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

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

  isIpBlocked(ip: string): boolean {
    const expiry = this.blockedIps.get(ip);
    if (!expiry) return false;

    if (Date.now() > expiry) {
      this.blockedIps.delete(ip);
      return false;
    }
    return true;
  }

  blockIp(ip: string, durationMs: number = this.blockDurationMs): void {
    this.blockedIps.set(ip, Date.now() + durationMs);
    logger.warn('RATE_LIMIT', `IP ${ip} blocked for ${Math.round(durationMs / 1000)}s`);
  }

  checkLimit(key: string, ip: string, weight: number = 1): RateLimitResult {
    const now = Date.now();

    if (this.isIpBlocked(ip)) {
      return { limited: true, reason: 'ip_blocked' };
    }

    let kData = this.keyData.get(key);
    if (!kData) {
      this.registerKey(key, ip);
      kData = this.keyData.get(key)!;
    }

    if (now > kData.resetTime) {
      kData.count = 0;
      kData.resetTime = now + this.windowMs;
    }

    kData.count += weight;
    kData.lastActivity = now;

    if (kData.count > this.maxRequests) {
      logger.warn('RATE_LIMIT', `Key ${key} (IP: ${ip}) exceeded limit (${kData.count}/${this.maxRequests})`);
      return {
        limited: true,
        reason: 'key_limit',
        remaining: 0,
        resetTime: kData.resetTime,
      };
    }

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

  getRemaining(key: string): { remaining: number; resetTime: number } {
    const data = this.keyData.get(key);
    if (!data) return { remaining: this.maxRequests, resetTime: Date.now() + this.windowMs };
    return {
      remaining: Math.max(0, this.maxRequests - data.count),
      resetTime: data.resetTime,
    };
  }

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

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  clear(): void {
    this.keyData.clear();
    this.ipData.clear();
    this.blockedIps.clear();
  }
}

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

export class RateLimiter {
  private core: RateLimiterCore;
  private socketIpMap: Map<string, string>;

  maxMessages: number;
  windowMs: number;
  ipMaxMessages: number;
  ipWindowMs: number;
  blockDurationMs: number;

  socketClients: Map<string, { ip: string; messageCount: number; resetTime: number; lastActivity: number }>;
  ipClients: Map<string, { socketIds: Set<string>; messageCount: number; resetTime: number; lastActivity: number }>;
  blockedIps: Map<string, number>;
  cleanupInterval: ReturnType<typeof setInterval> | null;

  constructor(options: SocketRateLimiterOptions = {}) {
    this.maxMessages = options.maxMessages ?? 100;
    this.windowMs = options.windowMs ?? 10000;
    this.ipMaxMessages = options.ipMaxMessages ?? 500;
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

    this.socketClients = new Map();
    this.ipClients = new Map();
    this.blockedIps = new Map();
    this.cleanupInterval = null;
  }

  static getClientIp(socket: Socket): string {
    return getIpFromSocket(socket);
  }

  initClient(socketId: string, ip: string = 'unknown'): void {
    this.socketIpMap.set(socketId, ip);
    this.core.registerKey(socketId, ip);
  }

  isIpBlocked(ip: string): boolean {
    return this.core.isIpBlocked(ip);
  }

  blockIp(ip: string, durationMs: number = this.blockDurationMs): void {
    this.core.blockIp(ip, durationMs);
  }

  isRateLimited(socketId: string, weight: number = 1): { limited: boolean; reason?: 'ip_blocked' | 'socket_limit' | 'ip_limit' } {
    let ip = this.socketIpMap.get(socketId);
    if (!ip) {
      ip = 'unknown';
      this.initClient(socketId, ip);
    }

    const result = this.core.checkLimit(socketId, ip, weight);

    let reason: 'ip_blocked' | 'socket_limit' | 'ip_limit' | undefined;
    if (result.reason === 'key_limit') {
      reason = 'socket_limit';
    } else if (result.reason) {
      reason = result.reason;
    }

    return { limited: result.limited, reason };
  }

  removeClient(socketId: string): void {
    const ip = this.socketIpMap.get(socketId) || 'unknown';
    this.core.unregisterKey(socketId, ip);
    this.socketIpMap.delete(socketId);
  }

  getClientStats(socketId: string): SocketClientStats | null {
    const ip = this.socketIpMap.get(socketId);
    if (!ip) return null;

    const { remaining, resetTime } = this.core.getRemaining(socketId);

    return {
      socketId,
      ip,
      messageCount: this.maxMessages - remaining,
      maxMessages: this.maxMessages,
      timeRemaining: Math.max(0, resetTime - Date.now()),
      isLimited: remaining === 0,
      ipMessageCount: 0,
      ipMaxMessages: this.ipMaxMessages,
      isIpBlocked: this.core.isIpBlocked(ip),
    };
  }

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

  shutdown(): void {
    this.core.shutdown();
  }

  clear(): void {
    this.core.clear();
    this.socketIpMap.clear();
  }

  getClientCount(): number {
    return this.socketIpMap.size;
  }
}

const maxMessages = parseInt(process.env.RATE_MAX_MESSAGES || '100');
const windowMs = parseInt(process.env.RATE_WINDOW_MS || '10000');
const ipMaxMessages = parseInt(process.env.RATE_IP_MAX_MESSAGES || '4500');
const blockDurationMs = parseInt(process.env.RATE_BLOCK_DURATION_MS || '60000');

export const rateLimiterInstance = new RateLimiter({
  maxMessages,
  windowMs,
  ipMaxMessages,
  blockDurationMs,
});

export function initRateLimit(socket: Socket): void {
  const ip = RateLimiter.getClientIp(socket);
  rateLimiterInstance.initClient(socket.id, ip);
}

export function checkRateLimit(socketId: string, weight: number = 1): boolean {
  const result = rateLimiterInstance.isRateLimited(socketId, weight);
  return !result.limited;
}

export function checkRateLimitDetailed(socketId: string, weight: number = 1): { allowed: boolean; reason?: string } {
  const result = rateLimiterInstance.isRateLimited(socketId, weight);
  return { allowed: !result.limited, reason: result.reason };
}

export function resetRateLimit(socketId: string): void {
  rateLimiterInstance.removeClient(socketId);
}

export function isIpBlocked(ip: string): boolean {
  return rateLimiterInstance.isIpBlocked(ip);
}

export function getRateLimitStats(): SocketRateLimiterStats {
  return rateLimiterInstance.getStats();
}

export async function isIpBlockedAsync(ip: string): Promise<boolean> {
  if (rateLimiterInstance.isIpBlocked(ip)) {
    return true;
  }

  const redisBlocked = await isIpBlockedRedis(ip);
  if (redisBlocked) {
    rateLimiterInstance.blockIp(ip);
    return true;
  }

  return false;
}

export async function blockIpAsync(ip: string, durationMs?: number): Promise<void> {
  const duration = durationMs ?? rateLimiterInstance.blockDurationMs;
  rateLimiterInstance.blockIp(ip, duration);
  await blockIpRedis(ip, duration);
}

export async function checkRateLimitAsync(
  key: string,
  ip: string,
  options: { maxRequests: number; windowMs: number; weight?: number }
): Promise<{ allowed: boolean; reason?: string; remaining: number }> {
  if (await isIpBlockedAsync(ip)) {
    return { allowed: false, reason: 'ip_blocked', remaining: 0 };
  }

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
