/**
 * Admin API Middleware
 * Authentication, rate limiting, and audit logging for admin routes.
 */

import { Response, NextFunction } from 'express';
import type { AdminRequest, AdminUser, RateLimitRecord } from './types';
import logger from '../../utils/logger';

const { getSupabase, isSupabaseConfigured } = require('../../modules/supabaseServer');

// ==================== Rate Limiting ====================

/**
 * Simple in-memory rate limiter for admin endpoints
 * More restrictive than general API rate limiting
 */
export const adminRateLimiter = {
  requests: new Map<string, RateLimitRecord>(),
  maxRequests: 60,        // Max requests per window (reduced from 300 for security)
  windowMs: 60 * 1000,    // 1 minute window

  isAllowed(ip: string): boolean {
    const now = Date.now();
    const key = `admin:${ip}`;

    if (!this.requests.has(key)) {
      this.requests.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    const record = this.requests.get(key)!;
    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + this.windowMs;
      return true;
    }

    if (record.count >= this.maxRequests) {
      logger.info('ADMIN_API', `Rate limit exceeded for IP: ${ip}`);
      return false;
    }

    record.count++;
    return true;
  },

  // Cleanup old entries every 5 minutes
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests) {
      if (now > record.resetAt + this.windowMs) {
        this.requests.delete(key);
      }
    }
  }
};

// Run cleanup periodically
setInterval(() => adminRateLimiter.cleanup(), 5 * 60 * 1000);

// ==================== PII Scrubbing ====================

const PII_KEYS = new Set(['email', 'phone', 'ip', 'ip_address', 'password', 'token']);

/**
 * Remove known PII keys from an object before logging.
 */
export function scrubPII(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !PII_KEYS.has(k.toLowerCase()))
  );
}

// ==================== Audit Logging ====================

/**
 * Log admin actions for audit trail.
 * PII is scrubbed from details. Admin email is NOT logged (only ID).
 */
export function auditLog(adminUser: AdminUser | undefined, action: string, details: Record<string, unknown> = {}): void {
  logger.info('ADMIN_AUDIT', JSON.stringify({
    timestamp: new Date().toISOString(),
    adminId: adminUser?.id || 'unknown',
    action,
    details: scrubPII(details),
  }));
}

// ==================== Middleware Functions ====================

/**
 * Rate limiting middleware for admin routes
 */
export function adminRateLimit(req: AdminRequest, res: Response, next: NextFunction): void {
  // Use rightmost IP from X-Forwarded-For (proxy-appended, not client-controlled)
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIps = typeof forwardedFor === 'string' ? forwardedFor.split(',').map(s => s.trim()).filter(Boolean) : [];
  const ip = (forwardedIps.length > 0 ? forwardedIps[forwardedIps.length - 1] : undefined) ||
             (req.headers['x-real-ip'] as string) ||
             req.socket.remoteAddress ||
             'unknown';

  if (!adminRateLimiter.isAllowed(ip)) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: 60
    });
    return;
  }

  next();
}

/**
 * Admin authentication middleware
 * Verifies JWT token and checks for admin role
 */
export async function adminAuth(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  // Generate request ID for tracing
  const requestId = `admin-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.info('ADMIN_API', `Missing auth header [${requestId}]`);
    res.status(401).json({ error: 'Missing authorization header', requestId });
    return;
  }

  const token = authHeader.substring(7);
  if (!isSupabaseConfigured()) {
    res.status(503).json({ error: 'Auth service not available', requestId });
    return;
  }

  try {
    const supabase = getSupabase();
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.info('ADMIN_API', `Invalid token [${requestId}]`);
      res.status(401).json({ error: 'Invalid token', requestId });
      return;
    }

    // Check if user is admin - server-side verification
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, username, display_name, admin_role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.info('ADMIN_API', `Non-admin access attempt [${requestId}]`);
      res.status(403).json({ error: 'Admin access required', requestId });
      return;
    }

    req.adminUser = {
      ...user,
      username: profile.username,
      admin_role: profile.admin_role ?? 'viewer',
    };

    // Forward admin context to downstream Next.js handlers via mutated request
    // headers — saves a duplicate getUser+profile roundtrip in App Router routes
    // mounted under /api/admin (e.g. android-beta send routes).
    // Header values must be ASCII (RFC 7230); non-ASCII names crash undici's
    // ByteString conversion — percent-encode and decodeURIComponent on read.
    req.headers['x-admin-user-id'] = user.id;
    req.headers['x-admin-email'] = encodeURIComponent(user.email ?? '');
    req.headers['x-admin-username'] = encodeURIComponent(profile.username ?? '');
    req.headers['x-admin-display-name'] = encodeURIComponent(profile.display_name ?? '');

    // Log successful admin access (no PII — use admin ID only)
    logger.debug('ADMIN_API', `Admin access: ${user.id} -> ${req.method} ${req.path} [${requestId}]`);

    next();
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Auth error: ${err.message} [${requestId}]`);
    res.status(500).json({ error: 'Authentication failed', requestId });
  }
}
