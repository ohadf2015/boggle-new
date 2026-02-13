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

import type { Namespace, Socket } from 'socket.io';

/**
 * Register all duel event handlers for a socket connection
 * Called when a client connects to the /duel namespace
 *
 * @param namespace - The /duel namespace instance
 * @param socket - The connected socket
 */
export function registerDuelHandlers(_namespace: Namespace, socket: Socket): void {
  console.log(`[DUEL] Socket connected: ${socket.id}`);

  // =============================================================================
  // DUEL LIFECYCLE HANDLERS
  // =============================================================================

  socket.on('duel:create', (data) => {
    console.log('[DUEL] duel:create received:', { socketId: socket.id, data });
    // TODO (Phase 38): Create async duel challenge
    // - Validate opponentId exists and is online
    // - Create duel record in database
    // - Emit duel:challenge-received to opponent
    // - Emit duel:created to creator
  });

  socket.on('duel:accept', (data) => {
    console.log('[DUEL] duel:accept received:', { socketId: socket.id, data });
    // TODO (Phase 38): Accept duel challenge
    // - Validate duelId exists and is pending
    // - Update duel status to active
    // - Generate game grid
    // - Emit duel:accepted to both players
    // - Start timer for async duel
  });

  socket.on('duel:decline', (data) => {
    console.log('[DUEL] duel:decline received:', { socketId: socket.id, data });
    // TODO (Phase 38): Decline duel challenge
    // - Validate duelId exists and is pending
    // - Update duel status to declined
    // - Emit duel:declined to challenger
    // - Clean up duel record
  });

  socket.on('duel:cancel', (data) => {
    console.log('[DUEL] duel:cancel received:', { socketId: socket.id, data });
    // TODO (Phase 38): Cancel pending duel
    // - Validate user is the creator
    // - Validate duel is still pending
    // - Update duel status to cancelled
    // - Emit duel:cancelled to opponent if notified
    // - Clean up duel record
  });

  // =============================================================================
  // GAMEPLAY HANDLERS (Real-Time Duels - Phase 39)
  // =============================================================================

  socket.on('duel:submit-word', (data) => {
    console.log('[DUEL] duel:submit-word received:', { socketId: socket.id, data });
    // TODO (Phase 39): Process word submission in real-time duel
    // - Validate word against dictionary
    // - Validate word path on grid
    // - Calculate points
    // - Update player score
    // - Emit duel:opponent-word to opponent
    // - Emit duel:opponent-progress with updated score
  });

  socket.on('duel:submit-score', (data) => {
    console.log('[DUEL] duel:submit-score received:', { socketId: socket.id, data });
    // TODO (Phase 38): Submit final score for async duel
    // - Validate duel exists and is active
    // - Validate user is participant
    // - Store score and words found
    // - If both players submitted, determine winner and emit duel:completed
  });

  // =============================================================================
  // LOBBY HANDLERS (Async Duels - Phase 38)
  // =============================================================================

  socket.on('duel:join-lobby', (data) => {
    console.log('[DUEL] duel:join-lobby received:', { socketId: socket.id, data });
    const lobbyRoom = `duel:lobby:${data.classroomId}`;
    socket.join(lobbyRoom);
    console.log(`[DUEL] Socket ${socket.id} joined lobby room: ${lobbyRoom}`);

    // TODO (Phase 38): Send lobby state to newly joined user
    // - Get list of active users in lobby
    // - Get list of pending challenges for this user
    // - Emit duel:lobby-update to all lobby members
  });

  socket.on('duel:leave-lobby', (data) => {
    console.log('[DUEL] duel:leave-lobby received:', { socketId: socket.id, data });
    const lobbyRoom = `duel:lobby:${data.classroomId}`;
    socket.leave(lobbyRoom);
    console.log(`[DUEL] Socket ${socket.id} left lobby room: ${lobbyRoom}`);

    // TODO (Phase 38): Update lobby state
    // - Remove user from active lobby users
    // - Emit duel:lobby-update to remaining lobby members
  });

  // =============================================================================
  // ROOM HANDLERS
  // =============================================================================

  socket.on('duel:join-room', (data) => {
    console.log('[DUEL] duel:join-room received:', { socketId: socket.id, data });
    const duelRoom = `duel:${data.duelId}`;
    socket.join(duelRoom);
    console.log(`[DUEL] Socket ${socket.id} joined duel room: ${duelRoom}`);

    // TODO (Phase 39): Send initial duel state to player
    // - Get duel state from database
    // - Get opponent's current progress
    // - Emit initial state to player
  });

  socket.on('duel:leave-room', (data) => {
    console.log('[DUEL] duel:leave-room received:', { socketId: socket.id, data });
    const duelRoom = `duel:${data.duelId}`;
    socket.leave(duelRoom);
    console.log(`[DUEL] Socket ${socket.id} left duel room: ${duelRoom}`);
  });

  // =============================================================================
  // DISCONNECT HANDLER
  // =============================================================================

  socket.on('disconnect', () => {
    console.log(`[DUEL] Socket disconnected: ${socket.id}`);

    // TODO (Phase 38/39): Clean up on disconnect
    // - Leave all lobby rooms
    // - Leave all duel rooms
    // - Emit lobby updates to affected lobbies
    // - For active duels, notify opponent of disconnection
    // - Handle forfeit logic if player doesn't reconnect within timeout
  });
}
