/**
 * Redis Adapter Setup for Horizontal Scaling
 * Configures Socket.IO to use Redis for cross-instance communication
 */

const { createAdapter } = require('@socket.io/redis-adapter');
const { initRedis, createPubSubClients, closeRedis } = require('../backend/redisClient');

/**
 * Initialize Redis and set up Socket.IO adapter
 * @param {Server} io - Socket.IO server instance
 * @returns {Promise<boolean>} Whether Redis adapter was successfully configured
 */
async function setupRedisAdapter(io) {
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
    console.warn('[SOCKET.IO] Could not set up Redis adapter:', error.message);
    return false;
  }
}

/**
 * Clean up Redis adapter clients
 * @param {Server} io - Socket.IO server instance
 */
async function cleanupRedisAdapter(io) {
  if (io.pubClient) {
    try {
      await io.pubClient.quit();
      console.log('[SHUTDOWN] Redis pub client closed');
    } catch (err) {
      console.error('[SHUTDOWN] Error closing pub client:', err.message);
    }
  }

  if (io.subClient) {
    try {
      await io.subClient.quit();
      console.log('[SHUTDOWN] Redis sub client closed');
    } catch (err) {
      console.error('[SHUTDOWN] Error closing sub client:', err.message);
    }
  }

  await closeRedis();
}

module.exports = {
  setupRedisAdapter,
  cleanupRedisAdapter,
};
