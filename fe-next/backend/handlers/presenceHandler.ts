/**
 * Presence Handler
 * Handles presence updates, heartbeats, and connection health
 */

import type { Server, Socket } from 'socket.io';
import type { Game, PresenceStatus, GameUser } from '@/shared/types';

import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  updateUserPresence,
  updateUserHeartbeat,
  forEachGame,
} from '../modules/gameStateManager.js';

import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import logger from '../utils/logger.js';
import { validatePayload, presenceUpdateSchema, heartbeatSchema } from '../utils/socketValidation.js';

// Types for payloads
interface PresenceUpdatePayload {
  status: PresenceStatus;
}

/**
 * Register presence-related socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerPresenceHandlers(io: Server, socket: Socket): void {

  // Handle ping (simple connection check)
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle presence update (active/idle/afk status)
  socket.on('presenceUpdate', (data: PresenceUpdatePayload) => {
    // Validate payload using standard schema
    const validation = validatePayload(presenceUpdateSchema, data);
    if (!validation.success) {
      logger.debug('PRESENCE', `Invalid presenceUpdate payload: ${validation.error}`);
      return;
    }

    const { status } = validation.data as PresenceUpdatePayload;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Convert status to PresenceData - the updateUserPresence function determines final status
    const presenceData = status === 'afk' ? { forceIdle: true } : { isWindowFocused: status === 'active' };

    // Update user presence
    updateUserPresence(gameCode, username, presenceData);

    // Broadcast to room
    broadcastToRoom(io, getGameRoom(gameCode), 'userPresenceChanged', {
      username,
      status,
      timestamp: Date.now()
    });

    logger.debug('PRESENCE', `${username} in game ${gameCode} is now ${status}`);
  });

  // Handle presence heartbeat
  socket.on('presenceHeartbeat', () => {
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    // Record heartbeat
    updateUserHeartbeat(gameCode, username);
  });
}

/**
 * Start connection health check interval
 * Checks for stale connections and cleans them up
 * @param io - Socket.IO server instance
 */
function startConnectionHealthCheck(io: Server): void {
  const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  const STALE_THRESHOLD = 60000; // 1 minute without heartbeat

  setInterval(() => {
    forEachGame((gameCode, game) => {
      for (const [username, userData] of Object.entries(game.users || {})) {
        // Skip if user is already marked disconnected
        if (userData.disconnected) continue;

        // Skip bots
        if (userData.isBot) continue;

        const lastHeartbeat = userData.lastHeartbeat || userData.lastActivity || 0;
        const now = Date.now();

        if (now - lastHeartbeat > STALE_THRESHOLD) {
          // Mark user as potentially stale
          logger.debug('PRESENCE', `User ${username} in game ${gameCode} may be stale (${Math.round((now - lastHeartbeat) / 1000)}s since last heartbeat)`);
        }
      }
    });
  }, HEALTH_CHECK_INTERVAL);
}

export { registerPresenceHandlers, startConnectionHealthCheck };
