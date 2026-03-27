/**
 * Cluster Mode for Multi-Core Utilization
 *
 * Forks worker processes based on available CPU cores.
 * Each worker runs an independent Socket.IO + Express server.
 * Redis adapter (required in production) handles cross-worker communication.
 *
 * Usage:
 *   CLUSTER_ENABLED=true node server.ts
 *
 * Without CLUSTER_ENABLED, the server runs in single-process mode (default).
 * This keeps development simple while enabling multi-core in production.
 */

import cluster from 'node:cluster';
import os from 'node:os';

const logger = console; // Use console before pino is initialized

/**
 * Number of workers to fork.
 * Defaults to CPU count, capped at 4 to avoid overwhelming Redis/Supabase.
 * Override with CLUSTER_WORKERS env var.
 */
function getWorkerCount(): number {
  if (process.env.CLUSTER_WORKERS) {
    return Math.max(1, parseInt(process.env.CLUSTER_WORKERS, 10) || 2);
  }
  // Cap at 4 workers — beyond that, Redis and Supabase connections become the bottleneck
  return Math.min(os.cpus().length, 4);
}

/**
 * Start in cluster mode if CLUSTER_ENABLED=true and this is the primary process.
 * Returns true if this process is the primary (callers should NOT start the server).
 * Returns false if this is a worker or clustering is disabled (callers SHOULD start the server).
 */
export function maybeStartCluster(): boolean {
  const enabled = process.env.CLUSTER_ENABLED === 'true';

  if (!enabled || !cluster.isPrimary) {
    return false; // Worker or single-process mode — caller starts the server
  }

  const workerCount = getWorkerCount();
  logger.log(`[cluster] Primary ${process.pid} forking ${workerCount} workers`);

  for (let i = 0; i < workerCount; i++) {
    cluster.fork();
  }

  // Replace crashed workers
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(
      `[cluster] Worker ${worker.process.pid} died (code=${code}, signal=${signal}). Restarting...`
    );
    // Delay restart slightly to avoid rapid restart loops
    setTimeout(() => cluster.fork(), 1000);
  });

  // Graceful shutdown: forward SIGTERM to all workers
  const shutdown = () => {
    logger.log('[cluster] Primary received shutdown signal, forwarding to workers');
    for (const id in cluster.workers) {
      cluster.workers[id]?.process.kill('SIGTERM');
    }
    // Give workers 15s to shut down gracefully, then force exit
    setTimeout(() => {
      logger.warn('[cluster] Force exiting primary after timeout');
      process.exit(1);
    }, 15000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return true; // Primary — don't start the server
}
