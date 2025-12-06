/**
 * Server Entry Point
 *
 * This file now delegates to the modular server implementation.
 * See server/index.js for the main orchestration logic.
 *
 * Modular structure:
 * - server/middleware.js - Express middleware configuration
 * - server/socketSetup.js - Socket.IO setup and monitoring
 * - server/redisAdapter.js - Redis adapter for horizontal scaling
 * - server/localeRedirect.js - i18n locale detection
 * - server/healthRoutes.js - Health and metrics endpoints
 * - server/lifecycle.js - Startup and shutdown management
 */

require('./server/index');
