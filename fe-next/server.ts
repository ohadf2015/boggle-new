/**
 * Server Entry Point
 *
 * Uses Bun native server with @socket.io/bun-engine for optimal WebSocket performance.
 * See server/bunServer.ts for the main server implementation.
 *
 * Modular structure:
 * - server/bunServer.ts - Bun native HTTP server with Socket.IO
 * - server/socketSetup.ts - Socket.IO monitoring and cleanup
 * - server/redisAdapter.ts - Redis adapter for horizontal scaling
 * - server/middleware.ts - CORS configuration utilities
 * - server/healthRoutes.ts - Health and metrics endpoints (legacy Express)
 * - server/lifecycle.ts - Startup and shutdown management
 *
 * Note: Express server is available in server/index.ts for fallback if needed.
 */

import './server/bunServer';
