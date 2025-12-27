/**
 * Server Entry Point
 *
 * This file now delegates to the modular server implementation.
 * See server/index.ts for the main orchestration logic.
 *
 * Modular structure:
 * - server/middleware.ts - Express middleware configuration
 * - server/socketSetup.ts - Socket.IO setup and monitoring
 * - server/redisAdapter.ts - Redis adapter for horizontal scaling
 * - server/localeRedirect.ts - i18n locale detection
 * - server/healthRoutes.ts - Health and metrics endpoints
 * - server/lifecycle.ts - Startup and shutdown management
 */

import './server/index';
