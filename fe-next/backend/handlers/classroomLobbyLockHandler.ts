import { z } from 'zod';
import type { Server, Socket } from 'socket.io';

import { getClassroomGame } from '../modules/classroomGameManager.js';
import { LOBBY_LOCK_EVENTS, lockSeatsOf, setClassroomLobbyLocked } from '../modules/classroomLobbyLock.js';
import { getGameUsers } from '../modules/gameStateManager.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { getAuthUserId } from './classroomSocketAuth.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { gameCodeSchema } from '../utils/socketValidation.js';
import logger from '../utils/logger.js';
import { LOBBY_LOCK_FAILED } from '@/shared/types/classroomLobbyLock';

const setSchema = z.object({ gameCode: gameCodeSchema, locked: z.boolean() });
const getSchema = z.object({ gameCode: gameCodeSchema });

const FAILED = { error: 'education.projectorLobby.lock.failed', code: LOBBY_LOCK_FAILED };

export function registerClassroomLobbyLockHandlers(io: Server, socket: Socket): void {
  const refuse = (gameCode?: string) => socket.emit('classroomGameError', { ...FAILED, ...(gameCode ? { gameCode } : {}) });

  socket.on(LOBBY_LOCK_EVENTS.set, async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }
    const parsed = setSchema.safeParse(data);
    if (!parsed.success) {
      refuse();
      return;
    }
    const { gameCode, locked } = parsed.data as { gameCode: string; locked: boolean };
    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      refuse(gameCode);
      return;
    }

    try {
      const game = await getClassroomGame(gameCode);
      if (!game || game.teacherId !== authUserId) {
        refuse(gameCode);
        return;
      }
      const seats = locked
        ? [...new Set([...lockSeatsOf((getGameUsers(gameCode) ?? []).filter((u) => !u.isBot)), ...(game.players ?? []).map((p) => `a:${p.userId}`)])]
        : [];
      if (!(await setClassroomLobbyLocked(gameCode, locked, seats))) {
        refuse(gameCode);
        return;
      }
      const announcement = { gameCode, locked };
      socket.emit(LOBBY_LOCK_EVENTS.changed, announcement);
      broadcastToRoom(io, getGameRoom(gameCode), LOBBY_LOCK_EVENTS.changed, announcement);
      io.to(`classroom:${game.classroomId}`).emit(LOBBY_LOCK_EVENTS.changed, announcement);
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to set lobby lock: ${error}`);
      refuse(gameCode);
    }
  });

  socket.on(LOBBY_LOCK_EVENTS.get, async (data: unknown) => {
    if (!checkRateLimit(socket.id)) return;
    const parsed = getSchema.safeParse(data);
    if (!parsed.success) return;
    const { gameCode } = parsed.data as { gameCode: string };
    const authUserId = getAuthUserId(socket);
    try {
      const game = await getClassroomGame(gameCode);
      if (!game || !authUserId || game.teacherId !== authUserId) return;
      socket.emit(LOBBY_LOCK_EVENTS.changed, { gameCode, locked: game.settings?.lobbyLocked === true });
    } catch (error) {
      logger.warn('CLASSROOM_GAME', `Lobby lock read failed for ${gameCode}: ${error}`);
    }
  });
}
