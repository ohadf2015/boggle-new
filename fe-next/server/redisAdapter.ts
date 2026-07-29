/**
 * Redis Adapter Setup for Horizontal Scaling
 * Configures Socket.IO to use Redis for cross-instance communication
 */

import { createAdapter } from '@socket.io/redis-adapter';
import { initRedis, createPubSubClients, closeRedis } from '../backend/redisClient';
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

    io.adapter(createAdapter(pubClient, subClient));

    // Store clients on io for cleanup
    io.pubClient = pubClient;
    io.subClient = subClient;

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
  if (io.pubClient) {
    try {
      await io.pubClient.quit();
      redisLogger.info('Redis pub client closed');
    } catch (err) {
      redisLogger.error({ err }, 'Error closing pub client');
    }
  }

  if (io.subClient) {
    try {
      await io.subClient.quit();
      redisLogger.info('Redis sub client closed');
    } catch (err) {
      redisLogger.error({ err }, 'Error closing sub client');
    }
  }

  await closeRedis();
}
