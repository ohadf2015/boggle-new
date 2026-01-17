/**
 * Routes Index
 * Central export for all API route modules
 */

import type { Application, Request, Response, Router } from 'express';
import adminRoutes from './admin';
import leaderboardRoutes from './leaderboard';
import singlePlayerLeaderboardRoutes from './singlePlayerLeaderboard';
import analyticsRoutes from './analytics';
import geolocationRoutes from './geolocation';
import healthRoutes from './health';
import dailyChallengeRoutes from './dailyChallenge';
import dictionaryRoutes from './dictionary';
 
import {
  apiRateLimiter,
  strictRateLimiter,
  getApiRateLimitStats,
} from '../utils/rateLimiter';

interface RateLimiterOptions {
  maxRequests?: number;
  windowMs?: number;
}

/**
 * Register all API routes on the Express app
 * @param app - Express application instance
 */
function registerRoutes(app: Application): void {
  // Health and metrics endpoints (no rate limiting for monitoring)
  app.get('/health', healthRoutes);
  app.use('/health', healthRoutes);

  // Apply global API rate limiting to all /api routes
  app.use('/api', apiRateLimiter());

  // Public API routes
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/single-player', singlePlayerLeaderboardRoutes);
  app.use('/api/geolocation', geolocationRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/daily-challenge', dailyChallengeRoutes);
  app.use('/api/dictionary', dictionaryRoutes);

  // Admin API routes (requires admin auth + stricter rate limits)
  app.use('/api/admin', strictRateLimiter({ maxRequests: 30, windowMs: 60000 } as RateLimiterOptions), adminRoutes);

  // Rate limit stats endpoint (admin only)
  app.get('/api/rate-limit-stats', strictRateLimiter(), (req: Request, res: Response): void => {
    // Basic protection - in production, add proper auth check
    const stats = getApiRateLimitStats();
    res.json({ success: true, data: stats });
  });
}

export {
  registerRoutes,
  adminRoutes,
  leaderboardRoutes,
  singlePlayerLeaderboardRoutes,
  analyticsRoutes,
  geolocationRoutes,
  healthRoutes,
  dailyChallengeRoutes,
  dictionaryRoutes
};
