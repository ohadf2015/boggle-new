/**
 * Routes Index
 * Central export for all API route modules
 */

const adminRoutes = require('./admin');
const leaderboardRoutes = require('./leaderboard');
const analyticsRoutes = require('./analytics');
const geolocationRoutes = require('./geolocation');
const healthRoutes = require('./health');
const {
  apiRateLimiter,
  strictRateLimiter,
  getApiRateLimitStats,
} = require('../utils/apiRateLimiter');

/**
 * Register all API routes on the Express app
 * @param {Express} app - Express application instance
 */
function registerRoutes(app) {
  // Health and metrics endpoints (no rate limiting for monitoring)
  app.get('/health', healthRoutes);
  app.use('/health', healthRoutes);

  // Apply global API rate limiting to all /api routes
  app.use('/api', apiRateLimiter());

  // Public API routes
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/geolocation', geolocationRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Admin API routes (requires admin auth + stricter rate limits)
  app.use('/api/admin', strictRateLimiter({ maxRequests: 30, windowMs: 60000 }), adminRoutes);

  // Rate limit stats endpoint (admin only)
  app.get('/api/rate-limit-stats', strictRateLimiter(), (req, res) => {
    // Basic protection - in production, add proper auth check
    const stats = getApiRateLimitStats();
    res.json({ success: true, data: stats });
  });
}

module.exports = {
  registerRoutes,
  adminRoutes,
  leaderboardRoutes,
  analyticsRoutes,
  geolocationRoutes,
  healthRoutes
};
