/**
 * Duel Lobby Handlers
 *
 * Manages lobby presence for async duels:
 * - Students join lobby rooms per classroom
 * - Track online opponents
 * - Broadcast lobby updates when students join/leave
 * - Clean up on disconnect
 *
 * In-memory tracking: Map<classroomId, Map<userId, OpponentInfo>>
 * This is acceptable for single-server deployment.
 */

import type { Namespace } from 'socket.io';
import { z } from 'zod';
import type { DuelSocket } from './types';
import { getPendingDuelsForStudent, type DuelRow } from '@/lib/supabase/education/duels';
import { getSupabaseAdmin } from '@/lib/admin/server';
import logger from '@/backend/utils/logger';
import { checkRateLimit } from '../../utils/rateLimiter';

// ==========================================
// Types
// ==========================================

interface OpponentInfo {
  userId: string;
  displayName: string;
  socketId: string;
}

interface LobbyState {
  availableOpponents: OpponentInfo[];
  pendingChallenges?: DuelRow[];
}

// ==========================================
// Validation Schemas
// ==========================================

const joinLobbySchema = z.object({
  classroomId: z.string().uuid('Invalid classroom ID'),
});

const leaveLobbySchema = z.object({
  classroomId: z.string().uuid('Invalid classroom ID'),
});

// ==========================================
// In-Memory Lobby Tracking
// ==========================================

/**
 * Map of classroom lobbies
 * Structure: Map<classroomId, Map<userId, OpponentInfo>>
 */
const lobbies = new Map<string, Map<string, OpponentInfo>>();

/**
 * Map of userId -> Set of classroomIds they're in
 * For cleanup on disconnect
 */
const userLobbyMembership = new Map<string, Set<string>>();

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get all opponents in a classroom lobby
 */
function getLobbyOpponents(classroomId: string): OpponentInfo[] {
  const lobby = lobbies.get(classroomId);
  if (!lobby) return [];
  return Array.from(lobby.values());
}

/**
 * Add user to lobby
 */
function addToLobby(
  classroomId: string,
  userId: string,
  displayName: string,
  socketId: string
): void {
  // Get or create lobby
  if (!lobbies.has(classroomId)) {
    lobbies.set(classroomId, new Map());
  }
  const lobby = lobbies.get(classroomId)!;

  // Add user to lobby
  lobby.set(userId, { userId, displayName, socketId });

  // Track membership for cleanup
  if (!userLobbyMembership.has(userId)) {
    userLobbyMembership.set(userId, new Set());
  }
  userLobbyMembership.get(userId)!.add(classroomId);
}

/**
 * Remove user from lobby
 */
function removeFromLobby(classroomId: string, userId: string): void {
  const lobby = lobbies.get(classroomId);
  if (!lobby) return;

  lobby.delete(userId);

  // Clean up empty lobbies
  if (lobby.size === 0) {
    lobbies.delete(classroomId);
  }

  // Update membership tracking
  const memberships = userLobbyMembership.get(userId);
  if (memberships) {
    memberships.delete(classroomId);
    if (memberships.size === 0) {
      userLobbyMembership.delete(userId);
    }
  }
}

/**
 * Remove user from all lobbies (on disconnect)
 */
function removeFromAllLobbies(userId: string): string[] {
  const memberships = userLobbyMembership.get(userId);
  if (!memberships) return [];

  const affectedClassrooms = Array.from(memberships);
  affectedClassrooms.forEach((classroomId) => {
    removeFromLobby(classroomId, userId);
  });

  return affectedClassrooms;
}

// ==========================================
// Handler Registration
// ==========================================

/**
 * Register lobby event handlers for a socket
 * @param namespace - The /duel namespace
 * @param socket - The connected socket
 */
export function registerLobbyHandlers(
  namespace: Namespace,
  socket: DuelSocket
): void {
  const userId = socket.data.userId;
  const displayName = socket.data.displayName;

  // ==========================================
  // duel:join-lobby - Join classroom lobby
  // ==========================================
  socket.on('duel:join-lobby', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('duel:error', { error: 'Rate limited' });
      return;
    }
    try {
      // Validate payload
      const validation = joinLobbySchema.safeParse(data);
      if (!validation.success) {
        socket.emit('duel:error', {
          message: validation.error.issues[0]?.message || 'Invalid payload',
        });
        return;
      }

      const { classroomId } = validation.data;

      // Join Socket.IO room
      const roomName = `duel:lobby:${classroomId}`;
      await socket.join(roomName);

      // Add to in-memory lobby tracking
      addToLobby(classroomId, userId, displayName, socket.id);

      logger.info('DUEL', `User ${userId} joined lobby: ${classroomId}`);

      // Get pending duels for this student
      let pendingChallenges: unknown[] = [];
      try {
        const result = await getPendingDuelsForStudent(userId, getSupabaseAdmin() ?? undefined);
        if (result.error) {
          logger.warn(
            'DUEL',
            `Failed to fetch pending duels for ${userId}: ${result.error.message}`
          );
        } else {
          pendingChallenges = result.data;
        }
      } catch (error) {
        logger.warn(
          'DUEL',
          `Exception fetching pending duels for ${userId}: ${(error as Error).message}`
        );
        // Continue without pending challenges - not critical
      }

      // Emit lobby state to joining socket
      const availableOpponents = getLobbyOpponents(classroomId);
      socket.emit('duel:lobby-state', {
        availableOpponents,
        pendingChallenges,
      });

      // Broadcast lobby update to all in room
      namespace.to(roomName).emit('duel:lobby-update', {
        availableOpponents,
      });
    } catch (error) {
      logger.error(
        'DUEL',
        `Error in duel:join-lobby: ${(error as Error).message}`
      );
      socket.emit('duel:error', {
        message: 'Internal server error',
      });
    }
  });

  // ==========================================
  // duel:leave-lobby - Leave classroom lobby
  // ==========================================
  socket.on('duel:leave-lobby', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('duel:error', { error: 'Rate limited' });
      return;
    }
    try {
      // Validate payload
      const validation = leaveLobbySchema.safeParse(data);
      if (!validation.success) {
        socket.emit('duel:error', {
          message: validation.error.issues[0]?.message || 'Invalid payload',
        });
        return;
      }

      const { classroomId } = validation.data;

      // Leave Socket.IO room
      const roomName = `duel:lobby:${classroomId}`;
      await socket.leave(roomName);

      // Remove from in-memory lobby tracking
      removeFromLobby(classroomId, userId);

      logger.info('DUEL', `User ${userId} left lobby: ${classroomId}`);

      // Broadcast lobby update to remaining members
      const availableOpponents = getLobbyOpponents(classroomId);
      namespace.to(roomName).emit('duel:lobby-update', {
        availableOpponents,
      });
    } catch (error) {
      logger.error(
        'DUEL',
        `Error in duel:leave-lobby: ${(error as Error).message}`
      );
      socket.emit('duel:error', {
        message: 'Internal server error',
      });
    }
  });

  // ==========================================
  // disconnect - Clean up on disconnect
  // ==========================================
  socket.on('disconnect', () => {
    try {
      // Remove from all lobbies
      const affectedClassrooms = removeFromAllLobbies(userId);

      logger.info(
        'DUEL',
        `User ${userId} disconnected, removed from ${affectedClassrooms.length} lobbies`
      );

      // Broadcast updates to affected lobbies
      affectedClassrooms.forEach((classroomId) => {
        const roomName = `duel:lobby:${classroomId}`;
        const availableOpponents = getLobbyOpponents(classroomId);
        namespace.to(roomName).emit('duel:lobby-update', {
          availableOpponents,
        });
      });
    } catch (error) {
      logger.error(
        'DUEL',
        `Error in disconnect cleanup: ${(error as Error).message}`
      );
    }
  });
}
