/**
 * Routes Index
 * Central export for all API route modules
 */

const adminRoutes = require('./admin');
const leaderboardRoutes = require('./leaderboard');
const analyticsRoutes = require('./analytics');
const geolocationRoutes = require('./geolocation');
const healthRoutes = require('./health');

/**
 * Register all API routes on the Express app
 * @param {Express} app - Express application instance
 */
function registerRoutes(app) {
  // Health and metrics endpoints (no auth required)
  app.get('/health', healthRoutes);
  app.use('/health', healthRoutes);

  // Public API routes
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/geolocation', geolocationRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Admin API routes (requires admin auth)
  app.use('/api/admin', adminRoutes);
}

module.exports = {
  registerRoutes,
  adminRoutes,
  leaderboardRoutes,
  analyticsRoutes,
  geolocationRoutes,
  healthRoutes
};
