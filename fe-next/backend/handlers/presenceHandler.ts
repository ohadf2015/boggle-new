/**
 * Presence Handler
 * Handles presence updates, heartbeats, and connection health
 */

import type { Server, Socket } from 'socket.io';
import type { PresenceStatus } from '@/shared/types';

import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  updateUserPresence,
  updateUserHeartbeat,
  forEachGame,
} from '../modules/gameStateManager.js';

import { volatileBroadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { checkAutoKickInactive, checkAfkWarnings } from './kickHandler.js';
import logger from '../utils/logger.js';
import { validatePayload, presenceUpdateSchema } from '../utils/socketValidation.js';

// Types for payloads — matches what the client actually sends
interface PresenceUpdatePayload {
  isWindowFocused?: boolean;
  isActive?: boolean;
  isIdle?: boolean;
  // Legacy field for backward compatibility
  status?: PresenceStatus;
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

  // Handle latency check (RTT measurement via acknowledgment callback)
  // Client sends { t: timestamp }, server immediately invokes callback
  // Client measures round-trip time from the timestamp delta
  socket.on('latencyCheck', (_data: unknown, callback: () => void) => {
    if (typeof callback === 'function') {
      callback();
    }
  });

  // Handle presence update (active/idle/afk status)
  socket.on('presenceUpdate', (data: PresenceUpdatePayload) => {
    if (!checkRateLimit(socket.id, 0.2)) return;

    // Validate payload using standard schema
    const validation = validatePayload(presenceUpdateSchema, data);
    if (!validation.success) {
      logger.debug('PRESENCE', `Invalid presenceUpdate payload: ${validation.error}`);
      return;
    }

    const payload = validation.data as PresenceUpdatePayload;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Derive status from client's actual payload fields (R-10 fix)
    // Client sends { isWindowFocused, isActive, isIdle }, not { status }
    let derivedStatus: PresenceStatus;
    if (payload.status) {
      // Legacy path: client sent explicit status string
      derivedStatus = payload.status;
    } else if (payload.isIdle) {
      derivedStatus = 'idle';
    } else if (payload.isActive || payload.isWindowFocused) {
      derivedStatus = 'active';
    } else {
      derivedStatus = 'idle';
    }

    const presenceData = derivedStatus === 'afk'
      ? { forceIdle: true }
      : { isWindowFocused: payload.isWindowFocused ?? (derivedStatus === 'active') };

    // Update user presence
    updateUserPresence(gameCode, username, presenceData);

    // Broadcast to room (volatile — non-critical presence update)
    volatileBroadcastToRoom(io, getGameRoom(gameCode), 'userPresenceChanged', {
      username,
      status: derivedStatus,
      timestamp: Date.now()
    });

    logger.debug('PRESENCE', `${username} in game ${gameCode} is now ${derivedStatus}`);
  });

  // Handle presence heartbeat
  socket.on('presenceHeartbeat', () => {
    if (!checkRateLimit(socket.id, 0.1)) return;

    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    // Record heartbeat
    updateUserHeartbeat(gameCode, username);
  });
}

/**
 * Start connection health check interval
 * Logs stale connections for operational visibility.
 * Actual disconnect handling is done by Socket.IO's native ping/pong timeout.
 * @param io - Socket.IO server instance
 */
// Module-level ref so the interval can be cleared on shutdown or re-init
let _healthCheckInterval: ReturnType<typeof setInterval> | null = null;

function startConnectionHealthCheck(io: Server): void {
  const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  const STALE_THRESHOLD = 60000; // 1 minute without heartbeat

  // Prevent duplicate intervals if called more than once
  if (_healthCheckInterval) {
    clearInterval(_healthCheckInterval);
  }

  _healthCheckInterval = setInterval(() => {
    forEachGame((gameCode, game) => {
      for (const [username, userData] of Object.entries(game.users || {})) {
        if (userData.disconnected || userData.isBot) continue;

        const lastHeartbeat = userData.lastHeartbeat || userData.lastActivity || 0;
        const isStale = Date.now() - lastHeartbeat > STALE_THRESHOLD;
        if (isStale && !userData._staleLogged) {
          userData._staleLogged = true;
          logger.info('PRESENCE', `Stale user ${username} in game ${gameCode} (${Math.round((Date.now() - lastHeartbeat) / 1000)}s since last heartbeat)`);
        } else if (!isStale && userData._staleLogged) {
          userData._staleLogged = false;
        }
      }
    });

    // Warn AFK players approaching kick threshold, then auto-kick
    checkAfkWarnings(io, forEachGame);
    checkAutoKickInactive(io, forEachGame);
  }, HEALTH_CHECK_INTERVAL);
}

/**
 * Stop the connection health check interval (for graceful shutdown)
 */
function stopConnectionHealthCheck(): void {
  if (_healthCheckInterval) {
    clearInterval(_healthCheckInterval);
    _healthCheckInterval = null;
  }
}

export { registerPresenceHandlers, startConnectionHealthCheck, stopConnectionHealthCheck };
