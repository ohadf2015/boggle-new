/**
 * The pressure dials' write path — a live room's calm-mode settings.
 *
 * `createClassroomGame` whitelists its settings keys (and is owned by another
 * change), so the dials cannot ride the room's birth. The lobby emits this
 * event the moment the room exists; `startGame` later resolves the dials off
 * the Redis record into the common payload. Same shape as the in-lobby mode
 * switch (`classroomGameModeHandler`), one listener in its own module so no
 * 500-line handler grows.
 *
 * Every refusal emits: a teacher who taps a dial and sees nothing happen has
 * no way to tell "saved" from "dropped" while thirty students wait (pitfall 4).
 */

import { z } from 'zod';
import type { Server, Socket } from 'socket.io';

import { getClassroomGame } from '../modules/classroomGameManager.js';
import { setClassroomPressureSettings } from '../modules/classroomGameSettings.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { getAuthUserId } from './classroomSocketAuth.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { gameCodeSchema } from '../utils/socketValidation.js';
import logger from '../utils/logger.js';

const pressureSchema = z.object({
  gameCode: gameCodeSchema,
  pressure: z
    .object({
      leaderboard: z.enum(['full', 'top3', 'hidden']).optional(),
      timer: z.enum(['full', 'gentle', 'off']).optional(),
      speedScoring: z.boolean().optional(),
    })
    // An object with zero valid fields is a refuse-out-loud case, not a write
    // of nothing that acks as if it were something.
    .refine((p) => Object.values(p).some((v) => v !== undefined)),
});

export function registerClassroomPressureHandlers(io: Server, socket: Socket): void {
  socket.on('updateClassroomGamePressure', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const validation = pressureSchema.safeParse(data);
    if (!validation.success) {
      socket.emit('classroomGameError', { error: 'education.classroomGame.pressureFailed' });
      return;
    }
    const payload = validation.data as {
      gameCode: string;
      pressure: { leaderboard?: 'full' | 'top3' | 'hidden'; timer?: 'full' | 'gentle' | 'off'; speedScoring?: boolean };
    };

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      socket.emit('classroomGameError', { error: 'education.classroomGame.pressureFailed' });
      return;
    }

    try {
      const game = await getClassroomGame(payload.gameCode);
      if (!game || authUserId !== game.teacherId) {
        socket.emit('classroomGameError', { error: 'education.classroomGame.pressureFailed' });
        return;
      }

      const applied = await setClassroomPressureSettings(payload.gameCode, payload.pressure);
      if (!applied) {
        socket.emit('classroomGameError', { error: 'education.classroomGame.pressureFailed' });
        return;
      }

      const announcement = { gameCode: payload.gameCode, pressure: payload.pressure };

      // The teacher's own ack, the game room (a QR guest lives there and
      // nowhere else), and the enrolled students watching from the class hub.
      socket.emit('classroomGamePressureChanged', announcement);
      broadcastToRoom(io, getGameRoom(payload.gameCode), 'classroomGamePressureChanged', announcement);
      io.to(`classroom:${game.classroomId}`).emit('classroomGamePressureChanged', announcement);

      logger.info('CLASSROOM_GAME', `Teacher ${authUserId} updated pressure dials on ${payload.gameCode}`);
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to update pressure dials: ${error}`);
      socket.emit('classroomGameError', { error: 'education.classroomGame.pressureFailed' });
    }
  });
}

export default registerClassroomPressureHandlers;
