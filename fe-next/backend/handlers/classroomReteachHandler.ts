import { z } from 'zod';
import type { Socket } from 'socket.io';

import { getClassroomGame } from '../modules/classroomGameManager.js';
import { restoreClassroomFullLesson, setClassroomReteachWords } from '../modules/classroomReteach.js';
import { getAuthUserId } from './classroomSocketAuth.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { gameCodeSchema } from '../utils/socketValidation.js';
import logger from '../utils/logger.js';

export const RETEACH_FAILED = 'education.results.reteachFailed';

const reteachSchema = z.object({
  gameCode: gameCodeSchema,
  words: z.array(z.string().trim().min(1).max(40)).min(1).max(100),
});
const restoreSchema = z.object({ gameCode: gameCodeSchema });

interface Route<T> {
  event: string;
  schema: z.ZodType<T>;
  applied: string;
  refused: string;
  apply: (data: T) => Promise<string[] | null>;
}

/** Every refusal emits: a teacher who taps a replay control must never see nothing happen. */
function registerTeacherRoomChange<T extends { gameCode: string }>(socket: Socket, route: Route<T>): void {
  socket.on(route.event, async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }
    const parsed = route.schema.safeParse(data);
    const gameCode = (data as { gameCode?: unknown } | null)?.gameCode;
    const refuse = () => socket.emit(route.refused, { error: RETEACH_FAILED, gameCode: typeof gameCode === 'string' ? gameCode : undefined });
    if (!parsed.success) {
      refuse();
      return;
    }
    const code = parsed.data.gameCode;

    try {
      const authUserId = getAuthUserId(socket);
      const game = await getClassroomGame(code);
      if (!authUserId || !game || game.teacherId !== authUserId || game.status === 'playing') {
        refuse();
        return;
      }
      const words = await route.apply(parsed.data);
      if (!words) {
        refuse();
        return;
      }
      socket.emit(route.applied, { gameCode: code, words });
    } catch (error) {
      logger.error('CLASSROOM_GAME', `${route.event} failed for ${code}: ${error}`);
      refuse();
    }
  });
}

export function registerClassroomReteachHandlers(socket: Socket): void {
  registerTeacherRoomChange(socket, {
    event: 'classroomReteachWords',
    schema: reteachSchema as z.ZodType<{ gameCode: string; words: string[] }>,
    applied: 'classroomReteachApplied',
    refused: 'classroomReteachRefused',
    apply: ({ gameCode, words }) => setClassroomReteachWords(gameCode, words),
  });
  registerTeacherRoomChange(socket, {
    event: 'classroomRestoreFullLesson',
    schema: restoreSchema as z.ZodType<{ gameCode: string }>,
    applied: 'classroomFullLessonRestored',
    refused: 'classroomFullLessonRefused',
    apply: ({ gameCode }) => restoreClassroomFullLesson(gameCode),
  });
}

export default registerClassroomReteachHandlers;
