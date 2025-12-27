/**
 * Redis Adapter Setup for Horizontal Scaling
 * Configures Socket.IO to use Redis for cross-instance communication
 */

import { createAdapter } from '@socket.io/redis-adapter';
import { initRedis, createPubSubClients, closeRedis } from '../backend/redisClient';

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
  const redisConnected = await initRedis();

  if (!redisConnected) {
    console.log('[SOCKET.IO] Running in single instance mode (no Redis adapter)');
    return false;
  }

  try {
    const clients = createPubSubClients();
    if (!clients) {
      console.log('[SOCKET.IO] Running in single instance mode (no pub/sub clients)');
      return false;
    }

    const { pubClient, subClient } = clients;
    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));

    // Store clients on io for cleanup
    io.pubClient = pubClient;
    io.subClient = subClient;

    console.log('[SOCKET.IO] Redis adapter enabled - horizontal scaling ready');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[SOCKET.IO] Could not set up Redis adapter:', errorMessage);
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
      console.log('[SHUTDOWN] Redis pub client closed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[SHUTDOWN] Error closing pub client:', errorMessage);
    }
  }

  if (io.subClient) {
    try {
      await io.subClient.quit();
      console.log('[SHUTDOWN] Redis sub client closed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[SHUTDOWN] Error closing sub client:', errorMessage);
    }
  }

  await closeRedis();
}
