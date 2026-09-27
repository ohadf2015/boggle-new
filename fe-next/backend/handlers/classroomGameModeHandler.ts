/**
 * Changing the game from inside a live lobby — the room keeps its code.
 *
 * A blind critic reproduced the gap this closes: once GO LIVE had fired, the
 * only way to change the mode was to EXIT, which tears the room down for every
 * student in it, and come back with a different six-character code the whole
 * class has to retype. A teacher who reads the room in the first ten seconds
 * ("they've done a grid all week — do the quiz") had no move that did not cost
 * the class its seats.
 *
 * WHY THE SERVER HAS TO BE TOLD. The room's mode is read from two places, and
 * only one of them is on the client:
 *
 *   - BOARD modes (classic / blast / word-hunt / wheel-rush) come off the
 *     host's own `startGame` payload.
 *   - VOCAB QUIZ is decided HERE: `startVocabQuizForClassroom` returns false
 *     unless the Redis classroom record says `settings.gameMode === 'vocab-quiz'`,
 *     and the board path runs instead.
 *
 * So a switch that moved client state only would work for three modes and fail
 * silently for the fourth — two paths to one outcome that disagree, recurring
 * pitfall class 3. `useClassroomModeSwitch` writes the client half and emits
 * this in the same call, so they cannot drift.
 *
 * Its own module because `classroomGameHandler.ts` is 485 lines and the cap is
 * 500; this file registers one listener and is imported there in one line,
 * exactly as `classroomGameEndHandler` is.
 */

import { z } from 'zod';
import type { Server, Socket } from 'socket.io';

import { getClassroomGame } from '../modules/classroomGameManager.js';
import { setClassroomGameMode } from '../modules/classroomGameSettings.js';
import type { SwitchableClassroomMode } from '../modules/classroomGameSettings';
import { CLASSROOM_GAME_MODES, type ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { getAuthUserId } from './classroomSocketAuth.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { gameCodeSchema } from '../utils/socketValidation.js';
import logger from '../utils/logger.js';

const updateModeSchema = z.object({
  gameCode: gameCodeSchema,
  // Built FROM the shared catalog, never retyped beside it: a sixth classroom
  // mode becomes switchable the day it is added, instead of being silently
  // rejected here (recurring pitfall class 3).
  gameMode: z.enum(CLASSROOM_GAME_MODES as unknown as [ClassroomGameMode, ...ClassroomGameMode[]]),
});

/**
 * Every refusal below emits. A teacher standing in front of a class who taps
 * "change game" and sees nothing happen has no way to tell "it worked" from
 * "the server dropped it" — the silent no-op of recurring pitfall class 4.
 */
export function registerClassroomGameModeHandlers(io: Server, socket: Socket): void {
  socket.on('updateClassroomGameMode', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const validation = updateModeSchema.safeParse(data);
    if (!validation.success) {
      socket.emit('classroomGameError', {
        error: 'education.modePicker.switchFailed',
        detail: validation.error.issues[0]?.message,
      });
      return;
    }
    // CLASSROOM_GAME_MODES (the zod enum above) is exactly the switchable set, so the narrower type is a fact, not a cast of convenience.
    const payload = validation.data as { gameCode: string; gameMode: SwitchableClassroomMode };

    const authUserId = getAuthUserId(socket);
    if (!authUserId) {
      socket.emit('classroomGameError', { error: 'education.modePicker.switchFailed' });
      return;
    }

    try {
      const game = await getClassroomGame(payload.gameCode);
      if (!game) {
        socket.emit('classroomGameError', { error: 'education.modePicker.switchFailed' });
        return;
      }
      if (authUserId !== game.teacherId) {
        socket.emit('classroomGameError', { error: 'education.modePicker.switchFailed' });
        return;
      }
      // The one refusal with a reason the teacher can act on. Swapping the
      // engine under a class that is mid-round would end the round for
      // everyone, so say so rather than doing it or doing nothing.
      if (game.status === 'playing') {
        socket.emit('classroomGameError', { error: 'education.modePicker.switchMidRound' });
        return;
      }

      const applied = await setClassroomGameMode(payload.gameCode, payload.gameMode);
      if (!applied) {
        socket.emit('classroomGameError', { error: 'education.modePicker.switchFailed' });
        return;
      }

      const announcement = { gameCode: payload.gameCode, gameMode: payload.gameMode };

      // The teacher's own confirmation carries the code it applied to, so the
      // client can ignore an ack for a room it is no longer in.
      socket.emit('classroomGameModeChanged', announcement);
      // Everyone on the board — including a guest who scanned the QR and is in
      // the game room and nowhere else.
      broadcastToRoom(io, getGameRoom(payload.gameCode), 'classroomGameModeChanged', announcement);
      // ...and the enrolled students watching from the class hub.
      io.to(`classroom:${game.classroomId}`).emit('classroomGameModeChanged', announcement);

      logger.info(
        'CLASSROOM_GAME',
        `Teacher ${authUserId} switched ${payload.gameCode} to ${payload.gameMode} in place`
      );
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to switch mode: ${error}`);
      socket.emit('classroomGameError', { error: 'education.modePicker.switchFailed' });
    }
  });
}

export default registerClassroomGameModeHandlers;
