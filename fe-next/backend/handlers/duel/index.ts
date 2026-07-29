/**
 * Duel Handler Registry
 *
 * Socket.IO namespace: /duel
 * Handles all duel-related real-time events including:
 * - Async duels: Lobby management, challenge creation/acceptance
 * - Real-time duels: Live gameplay, word submission, progress updates
 *
 * Namespace Architecture:
 * - Isolated from default namespace to prevent event collision
 * - Uses separate middleware chain for duel-specific auth/validation
 * - Room naming: duel:${duelId} for games, duel:lobby:${classroomId} for lobbies
 *
 * Room Management:
 * - Game rooms: Players join duel:${duelId} when a duel starts
 * - Lobby rooms: Students join duel:lobby:${classroomId} to see available opponents
 * - Automatic cleanup on disconnect
 *
 * Event Flow:
 * 1. Async Duels (Phase 38):
 *    - Player joins lobby -> sees available opponents
 *    - Player creates challenge -> opponent receives notification
 *    - Opponent accepts -> duel becomes active
 *    - Players submit scores asynchronously
 *
 * 2. Real-Time Duels (Phase 39):
 *    - Similar to async, but both players join duel room simultaneously
 *    - Real-time word submission and progress updates
 *    - Live opponent visibility
 *
 * @see types.ts for event definitions
 */

import type { Namespace } from 'socket.io';
import type { DuelSocket } from './types';
import { registerLifecycleHandlers } from './lifecycle';
import { registerLobbyHandlers } from './lobby';
import { registerGameplayHandlers } from './gameplay';
import { registerRealtimeHandlers } from './realtime';
import { registerDisconnectionHandlers, handleReconnection } from './disconnection';
import logger from '@/backend/utils/logger';

/**
 * Register all duel event handlers for a socket connection
 * Called when a client connects to the /duel namespace
 *
 * Wires together:
 * - Lifecycle handlers (create, accept, decline, cancel)
 * - Lobby handlers (join, leave, disconnect)
 * - Gameplay handlers (score submission, duel completion, XP award)
 * - Realtime handlers (word submission, progress updates)
 * - Disconnection handlers (grace period, forfeit, reconnection)
 *
 * @param namespace - The /duel namespace instance
 * @param socket - The connected socket
 */
export function registerDuelHandlers(namespace: Namespace, socket: DuelSocket): void {
  logger.info('DUEL', `Socket connected: ${socket.id} (user: ${socket.data.userId})`);

  // Register lifecycle handlers (create, accept, decline, cancel)
  registerLifecycleHandlers(namespace, socket);

  // Register lobby handlers (join, leave, disconnect cleanup)
  registerLobbyHandlers(namespace, socket);

  // Register gameplay handlers (score submission, duel completion, XP award)
  registerGameplayHandlers(namespace, socket);

  // Register realtime handlers (word submission, progress updates)
  registerRealtimeHandlers(namespace, socket);

  // Register disconnection handlers (grace period, forfeit)
  registerDisconnectionHandlers(namespace, socket);

  // Handle reconnection (check for pending grace period)
  handleReconnection(namespace, socket);
}
