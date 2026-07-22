/**
 * Redis Adapter Setup for Horizontal Scaling
 * Configures Socket.IO to use Redis for cross-instance communication
 */

import { createAdapter } from '@socket.io/redis-adapter';
import { initRedis, createPubSubClients, closeRedis, getRedisClient } from '../backend/redisClient';
import { redisLogger } from './logger';

import type { Server } from 'socket.io';
import type { Redis as RedisClient } from 'ioredis';

/**
 * Extended Socket.IO Server with Redis clients
 */
export interface ExtendedSocketServer extends Server {
  pubClient?: RedisClient;
  subClient?: RedisClient;
}

// Tracks whether the initial adapter setup has completed. Used to distinguish
// the first connection from later reconnections of the main Redis client.
let initialSetupComplete = false;

// Keep track of event listeners so cleanupRedisAdapter can remove them.
const adapterListeners = new Set<() => void>();

/**
 * Attach the Redis adapter to the Socket.IO server and store the clients.
 */
function attachAdapter(io: ExtendedSocketServer, pubClient: RedisClient, subClient: RedisClient): void {
  io.adapter(createAdapter(pubClient, subClient));
  io.pubClient = pubClient;
  io.subClient = subClient;
}

/**
 * Close pub/sub clients safely without throwing.
 */
async function closePubSubClients(io: ExtendedSocketServer): Promise<void> {
  if (io.pubClient) {
    try {
      await io.pubClient.quit();
      redisLogger.info('Redis pub client closed');
    } catch (err) {
      redisLogger.error({ err }, 'Error closing pub client');
    }
    io.pubClient = undefined;
  }

  if (io.subClient) {
    try {
      await io.subClient.quit();
      redisLogger.info('Redis sub client closed');
    } catch (err) {
      redisLogger.error({ err }, 'Error closing sub client');
    }
    io.subClient = undefined;
  }
}

/**
 * Re-register the adapter after pub/sub clients reconnect. The adapter can
 * become stale if the underlying Redis connection was dropped, so re-attaching
 * it ensures broadcasts resume correctly.
 */
function registerAdapterReconnectHandlers(
  io: ExtendedSocketServer,
  pubClient: RedisClient,
  subClient: RedisClient
): void {
  let pubReady = pubClient.status === 'ready';
  let subReady = subClient.status === 'ready';

  const tryReattach = (): void => {
    if (pubReady && subReady) {
      try {
        attachAdapter(io, pubClient, subClient);
        redisLogger.info('Redis adapter re-registered after pub/sub reconnection');
      } catch (err) {
        redisLogger.warn({ err }, 'Failed to re-register Redis adapter');
      }
    }
  };

  const onPubConnect = (): void => {
    pubReady = true;
    tryReattach();
  };
  const onSubConnect = (): void => {
    subReady = true;
    tryReattach();
  };
  const onPubEnd = (): void => {
    pubReady = false;
    redisLogger.warn('Redis pub client ended — cross-instance broadcast degraded');
  };
  const onSubEnd = (): void => {
    subReady = false;
    redisLogger.warn('Redis sub client ended — cross-instance broadcast degraded');
  };

  pubClient.on('connect', onPubConnect);
  pubClient.on('ready', onPubConnect);
  pubClient.on('end', onPubEnd);
  subClient.on('connect', onSubConnect);
  subClient.on('ready', onSubConnect);
  subClient.on('end', onSubEnd);

  const cleanup = (): void => {
    pubClient.off('connect', onPubConnect);
    pubClient.off('ready', onPubConnect);
    pubClient.off('end', onPubEnd);
    subClient.off('connect', onSubConnect);
    subClient.off('ready', onSubConnect);
    subClient.off('end', onSubEnd);
  };

  adapterListeners.add(cleanup);
}

/**
 * Watch the main Redis client and recreate the pub/sub adapter if the main
 * connection recovers. This handles cases where Redis was down long enough that
 * the duplicated pub/sub clients also lost their connection state.
 */
function registerMainClientReconnectHandler(io: ExtendedSocketServer): void {
  const mainClient = getRedisClient();
  if (!mainClient) return;

  const onReady = async (): Promise<void> => {
    if (!initialSetupComplete) {
      // This is the initial connection; the adapter is already being set up.
      return;
    }

    redisLogger.info('Redis main client reconnected — recreating pub/sub adapter');

    try {
      // Remove old listeners before closing so they don't fire on quit().
      adapterListeners.forEach((cleanup) => cleanup());
      adapterListeners.clear();

      await closePubSubClients(io);

      const clients = createPubSubClients();
      if (!clients) {
        redisLogger.error('Failed to recreate Redis pub/sub clients after main reconnection');
        return;
      }

      const { pubClient, subClient } = clients;

      const PUBSUB_TIMEOUT_MS = 10000;
      await Promise.race([
        Promise.all([pubClient.connect(), subClient.connect()]),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Redis pub/sub connection timed out after ${PUBSUB_TIMEOUT_MS}ms`)),
            PUBSUB_TIMEOUT_MS
          )
        ),
      ]);

      attachAdapter(io, pubClient, subClient);
      registerAdapterReconnectHandlers(io, pubClient, subClient);

      redisLogger.info('Redis adapter re-attached after main client reconnection');
    } catch (err) {
      redisLogger.warn({ err }, 'Could not re-create Redis adapter after main client reconnection');
    }
  };

  mainClient.on('ready', onReady);

  const cleanup = (): void => {
    mainClient.off('ready', onReady);
  };
  adapterListeners.add(cleanup);
}

/**
 * Initialize Redis and set up Socket.IO adapter
 * @param io - Socket.IO server instance
 * @returns Whether Redis adapter was successfully configured
 */
export async function setupRedisAdapter(io: ExtendedSocketServer): Promise<boolean> {
  const isProduction = process.env.NODE_ENV === 'production';
  const redisConnected = await initRedis();

  if (!redisConnected) {
    if (isProduction) {
      redisLogger.error('Redis unavailable in production — running in degraded single-instance mode. Horizontal scaling disabled.');
    } else {
      redisLogger.info('Running in single instance mode (no Redis adapter) — OK for development');
    }
    return false;
  }

  try {
    const clients = createPubSubClients();
    if (!clients) {
      if (isProduction) {
        redisLogger.error('Redis pub/sub clients failed — cannot run production without cross-instance communication');
        throw new Error('Redis pub/sub clients required in production for Socket.IO adapter.');
      }
      redisLogger.info('Running in single instance mode (no pub/sub clients)');
      return false;
    }

    const { pubClient, subClient } = clients;

    // Timeout pub/sub connection to prevent blocking startup indefinitely
    const PUBSUB_TIMEOUT_MS = 10000;
    await Promise.race([
      Promise.all([pubClient.connect(), subClient.connect()]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Redis pub/sub connection timed out after ${PUBSUB_TIMEOUT_MS}ms`)), PUBSUB_TIMEOUT_MS)
      ),
    ]);

    attachAdapter(io, pubClient, subClient);
    registerAdapterReconnectHandlers(io, pubClient, subClient);
    registerMainClientReconnectHandler(io);

    initialSetupComplete = true;

    redisLogger.info('Redis adapter enabled - horizontal scaling ready');
    return true;
  } catch (error) {
    redisLogger.warn({ err: error }, 'Could not set up Redis adapter');
    return false;
  }
}

/**
 * Clean up Redis adapter clients
 * @param io - Socket.IO server instance
 */
export async function cleanupRedisAdapter(io: ExtendedSocketServer): Promise<void> {
  adapterListeners.forEach((cleanup) => cleanup());
  adapterListeners.clear();

  await closePubSubClients(io);

  await closeRedis();
}
