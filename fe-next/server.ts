/**
 * Server Entry Point
 *
 * Supports optional cluster mode for multi-core utilization.
 * Set CLUSTER_ENABLED=true to fork workers (recommended for production).
 *
 * Modular structure:
 * - server/cluster.ts - Cluster mode orchestration
 * - server/index.ts - Main server logic (Express + Socket.IO + Next.js)
 * - server/middleware.ts - Express middleware configuration
 * - server/socketSetup.ts - Socket.IO setup and monitoring
 * - server/redisAdapter.ts - Redis adapter for horizontal scaling
 * - server/localeRedirect.ts - i18n locale detection
 * - server/healthRoutes.ts - Health and metrics endpoints
 * - server/lifecycle.ts - Startup and shutdown management
 */

import { maybeStartCluster } from './server/cluster';

// In cluster mode, primary process forks workers and doesn't run the server.
// Workers (and single-process mode) proceed to start the server.
if (!maybeStartCluster()) {
  import('./server/index');
}
