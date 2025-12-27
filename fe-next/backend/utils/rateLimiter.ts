/**
 * Enhanced Rate Limiter with IP-based tracking
 * Provides protection against reconnection bypass attacks by tracking both IP and socket ID
 */

import type { Socket } from 'socket.io';
import logger from './logger';

// ==========================================
// Type Definitions
// ==========================================

interface RateLimiterOptions {
  maxMessages?: number;
  windowMs?: number;
  ipMaxMessages?: number;
  ipWindowMs?: number;
  blockDurationMs?: number;
}

interface SocketRateData {
  ip: string;
  messageCount: number;
  resetTime: number;
  lastActivity: number;
}

interface IpRateData {
  socketIds: Set<string>;
  messageCount: number;
  resetTime: number;
  lastActivity: number;
}

interface RateLimitResult {
  limited: boolean;
  reason?: 'ip_blocked' | 'socket_limit' | 'ip_limit';
}

interface ClientStats {
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

interface RateLimiterStats {
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

// ==========================================
// Rate Limiter Class
// ==========================================

/**
 * Sliding window rate limiter with multi-key support
 * Tracks rate limits by IP address, socket ID, and combined keys
 */
export class RateLimiter {
  maxMessages: number;
  windowMs: number;
  ipMaxMessages: number;
  ipWindowMs: number;
  blockDurationMs: number;
  socketClients: Map<string, SocketRateData>;
  ipClients: Map<string, IpRateData>;
  blockedIps: Map<string, number>;
  cleanupInterval: ReturnType<typeof setInterval> | null;

  constructor(options: RateLimiterOptions = {}) {
    // Per-socket limit: 150 messages per 10 seconds (15 msg/sec per user)
    // Typical usage: ~5-10 msg/sec during active gameplay
    this.maxMessages = options.maxMessages || 150;
    this.windowMs = options.windowMs || 10000;

    // Per-IP limit: 4500 messages per 10 seconds (450 msg/sec shared)
    // This accommodates ~30 users playing simultaneously from same WiFi/NAT
    this.ipMaxMessages = options.ipMaxMessages || 4500;
    this.ipWindowMs = options.ipWindowMs || 10000;

    // Block duration after exceeding limit
    this.blockDurationMs = options.blockDurationMs || 60000; // 1 minute block

    // Separate tracking for different identifiers
    this.socketClients = new Map();  // Socket ID -> rate data
    this.ipClients = new Map();      // IP address -> rate data
    this.blockedIps = new Map();     // IP address -> block expiry timestamp

    // Cleanup stale entries every minute
    // Use unref() so the interval doesn't prevent process exit (important for tests)
    this.cleanupInterval = setInterval(() => this._cleanup(), 60000);
    this.cleanupInterval.unref();
  }

  /**
   * Extract client IP from socket handshake
   * Handles X-Forwarded-For, X-Real-IP, and direct connection
   */
  static getClientIp(socket: Socket): string {
    if (!socket || !socket.handshake) return 'unknown';

    const headers = socket.handshake.headers || {};

    // Check X-Forwarded-For (may contain multiple IPs)
    const forwardedFor = headers['x-forwarded-for'];
    if (forwardedFor) {
      // Take the first IP (original client)
      const forwardedForStr = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      const ips = forwardedForStr.split(',').map((ip: string) => ip.trim());
      if (ips[0]) return ips[0];
    }

    // Check X-Real-IP (nginx/reverse proxy)
    const realIp = headers['x-real-ip'];
    if (realIp) return Array.isArray(realIp) ? realIp[0] : realIp;

    // Check CF-Connecting-IP (Cloudflare)
    const cfIp = headers['cf-connecting-ip'];
    if (cfIp) return Array.isArray(cfIp) ? cfIp[0] : cfIp;

    // Fall back to direct socket address
    return socket.handshake.address || 'unknown';
  }

  /**
   * Initialize rate limiting for a socket with IP tracking
   */
  initClient(socketId: string, ip: string = 'unknown'): void {
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
      const ipData = this.ipClients.get(ip)!;
      ipData.socketIds.add(socketId);
      ipData.lastActivity = now;
    }
  }

  /**
   * Check if IP is currently blocked
   */
  isIpBlocked(ip: string): boolean {
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
   */
  blockIp(ip: string, durationMs: number = this.blockDurationMs): void {
    this.blockedIps.set(ip, Date.now() + durationMs);
    logger.warn('RATE_LIMIT', `IP ${ip} blocked for ${durationMs}ms`);
  }

  /**
   * Check if a client has exceeded the rate limit
   */
  isRateLimited(socketId: string, weight: number = 1): RateLimitResult {
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
   */
  removeClient(socketId: string): void {
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
   */
  getClientStats(socketId: string): ClientStats | null {
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
   */
  getStats(): RateLimiterStats {
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
   */
  private _cleanup(): void {
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
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all rate limiting data
   */
  clear(): void {
    this.socketClients.clear();
    this.ipClients.clear();
    this.blockedIps.clear();
  }

  // Legacy method for backwards compatibility
  getClientCount(): number {
    return this.socketClients.size;
  }
}

// Create singleton instance with configurable options
// These can be overridden via environment variables
const maxMessages = parseInt(process.env.RATE_MAX_MESSAGES || '150');
const windowMs = parseInt(process.env.RATE_WINDOW_MS || '10000');
const ipMaxMessages = parseInt(process.env.RATE_IP_MAX_MESSAGES || '4500'); // Supports ~30 users on same WiFi
const blockDurationMs = parseInt(process.env.RATE_BLOCK_DURATION_MS || '60000');

export const rateLimiterInstance = new RateLimiter({
  maxMessages,
  windowMs,
  ipMaxMessages,
  blockDurationMs
});

/**
 * Initialize rate limiting for a socket connection
 * Should be called when a socket connects
 */
export function initRateLimit(socket: Socket): void {
  const ip = RateLimiter.getClientIp(socket);
  rateLimiterInstance.initClient(socket.id, ip);
}

/**
 * Check if a client is allowed to proceed (not rate limited)
 */
export function checkRateLimit(socketId: string, weight: number = 1): boolean {
  const result = rateLimiterInstance.isRateLimited(socketId, weight);
  return !result.limited;
}

interface DetailedRateLimitResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check rate limit with detailed result
 */
export function checkRateLimitDetailed(socketId: string, weight: number = 1): DetailedRateLimitResult {
  const result = rateLimiterInstance.isRateLimited(socketId, weight);
  return { allowed: !result.limited, reason: result.reason };
}

/**
 * Reset/remove rate limiting for a client (e.g., on disconnect)
 */
export function resetRateLimit(socketId: string): void {
  rateLimiterInstance.removeClient(socketId);
}

/**
 * Check if an IP is currently blocked
 */
export function isIpBlocked(ip: string): boolean {
  return rateLimiterInstance.isIpBlocked(ip);
}

/**
 * Get rate limiter statistics
 */
export function getRateLimitStats(): RateLimiterStats {
  return rateLimiterInstance.getStats();
}

export default rateLimiterInstance;
