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
  maxRequests: 100,       // Max requests per window
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
      logger.warn('ADMIN_API', `Rate limit exceeded for IP: ${ip}`);
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

// ==================== Audit Logging ====================

/**
 * Log admin actions for audit trail
 */
export function auditLog(adminUser: AdminUser | undefined, action: string, details: Record<string, unknown> = {}): void {
  logger.info('ADMIN_AUDIT', JSON.stringify({
    timestamp: new Date().toISOString(),
    adminId: adminUser?.id || 'unknown',
    adminEmail: adminUser?.email || 'unknown',
    action,
    details,
  }));
}

// ==================== Middleware Functions ====================

/**
 * Rate limiting middleware for admin routes
 */
export function adminRateLimit(req: AdminRequest, res: Response, next: NextFunction): void {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined) ||
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
    logger.warn('ADMIN_API', `Missing auth header [${requestId}]`);
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
      logger.warn('ADMIN_API', `Invalid token [${requestId}]`);
      res.status(401).json({ error: 'Invalid token', requestId });
      return;
    }

    // Check if user is admin - server-side verification
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('ADMIN_API', `Non-admin access attempt by ${user.email} [${requestId}]`);
      res.status(403).json({ error: 'Admin access required', requestId });
      return;
    }

    req.adminUser = { ...user, username: profile.username };

    // Log successful admin access
    logger.debug('ADMIN_API', `Admin access: ${user.email} -> ${req.method} ${req.path} [${requestId}]`);

    next();
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Auth error: ${err.message} [${requestId}]`);
    res.status(500).json({ error: 'Authentication failed', requestId });
  }
}
