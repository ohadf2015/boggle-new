/**
 * Admin API Routes - Main Router
 * Combines all admin sub-routers with authentication and rate limiting.
 *
 * Security features:
 * - JWT authentication via Supabase
 * - Admin role verification
 * - Rate limiting per IP
 * - Audit logging for sensitive operations
 *
 * Route structure:
 * - /api/admin/stats - Dashboard statistics
 * - /api/admin/players/* - Player management
 * - /api/admin/users/:userId/set-teacher-role - Promote user to teacher role
 * - /api/admin/games/* - Game history
 * - /api/admin/activity/* - Activity tracking
 * - /api/admin/realtime - Live stats
 * - /api/admin/live-games - Live game monitoring
 * - /api/admin/analytics/* - Guest analytics
 * - /api/admin/bot-words - Bot word management
 * - /api/admin/bot-blacklist - Blacklist management
 * - /api/admin/community-words - Community word moderation
 * - /api/admin/invalid-words - Invalid word submissions
 * - /api/admin/daily-word/* - Daily challenge management
 * - /api/admin/send-test-email - Email testing
 * - /api/admin/send-test-reengagement - Re-engagement email testing
 */

import express, { Router } from 'express';
import { adminRateLimit, adminAuth } from './middleware';
import statsRoutes from './statsRoutes';
import playerRoutes from './playerRoutes';
import playerDetailRoutes from './playerDetailRoutes';
import authSessionsRoutes from './authSessionsService';
import gameRoutes from './gameRoutes';
import wordModerationRoutes from './wordModerationRoutes';
import utilityRoutes from './utilityRoutes';
import ugcModerationRoutes from './ugcModerationRoutes';
import systemHealthRoutes from './systemHealthRoutes';
import analyticsRoutes from './analyticsRoutes';
import moderationRoutes from './moderationRoutes';
import cheatDetectionRoutes from './cheatDetectionRoutes';
import curatorRoutes from './curatorRoutes';
import adminGiftRoutes from '../adminGift';
import adminNotificationRoutes from '../adminNotification';

const router: Router = express.Router();

// Apply rate limiting first, then auth to all admin routes
router.use(adminRateLimit);
router.use(adminAuth);

// Mount sub-routers
// Stats routes (/api/admin/stats)
router.use('/', statsRoutes);

// Player routes (/api/admin/players/*)
router.use('/', playerRoutes);

// Player drill-down detail (/api/admin/players/:id/detail)
router.use('/', playerDetailRoutes);

// Auth game-sessions analytics (/api/admin/analytics/auth-games)
router.use('/', authSessionsRoutes);

// Game routes (/api/admin/games/*, /api/admin/activity/*, /api/admin/realtime, etc.)
router.use('/', gameRoutes);

// Word moderation routes (/api/admin/bot-words, /api/admin/community-words, /api/admin/invalid-words)
router.use('/', wordModerationRoutes);

// UGC moderation routes (/api/admin/ugc/*)
router.use('/', ugcModerationRoutes);

// Analytics routes (/api/admin/analytics/*)
router.use('/', analyticsRoutes);

// Moderation routes (/api/admin/moderation/*)
router.use('/', moderationRoutes);

// Cheat detection routes (/api/admin/cheat/*)
router.use('/', cheatDetectionRoutes);

// System health routes (/api/admin/system/*)
router.use('/', systemHealthRoutes);

// Utility routes (/api/admin/daily-word/*, /api/admin/send-test-email)
router.use('/', utilityRoutes);

// Language Curator assignments (/api/admin/curators)
router.use('/curators', curatorRoutes);

// Gift routes (/api/admin/gift/*)
router.use('/gift', adminGiftRoutes);

// Notification routes (/api/admin/notification/*)
router.use('/notification', adminNotificationRoutes);

export default router;

// Re-export types and middleware for external use
export * from './types';
export { auditLog, adminRateLimit, adminAuth, adminRateLimiter } from './middleware';
