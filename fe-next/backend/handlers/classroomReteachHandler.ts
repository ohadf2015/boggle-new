import { z } from 'zod';
import type { Socket } from 'socket.io';

import { getClassroomGame } from '../modules/classroomGameManager.js';
import { setClassroomReteachWords } from '../modules/classroomReteach.js';
import { getAuthUserId } from './classroomSocketAuth.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { gameCodeSchema } from '../utils/socketValidation.js';
import logger from '../utils/logger.js';

export const RETEACH_FAILED = 'education.results.reteachFailed';

const reteachSchema = z.object({
  gameCode: gameCodeSchema,
  words: z.array(z.string().trim().min(1).max(40)).min(1).max(100),
});

/** Every refusal emits: a teacher who taps "replay missed words" must never see nothing happen. */
export function registerClassroomReteachHandlers(socket: Socket): void {
  socket.on('classroomReteachWords', async (data: unknown) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }
    const parsed = reteachSchema.safeParse(data);
    const gameCode = (data as { gameCode?: unknown } | null)?.gameCode;
    const refuse = () => socket.emit('classroomReteachRefused', { error: RETEACH_FAILED, gameCode: typeof gameCode === 'string' ? gameCode : undefined });
    if (!parsed.success) {
      refuse();
      return;
    }
    const { gameCode: code, words } = parsed.data as { gameCode: string; words: string[] };

    try {
      const authUserId = getAuthUserId(socket);
      const game = await getClassroomGame(code);
      if (!authUserId || !game || game.teacherId !== authUserId || game.status === 'playing') {
        refuse();
        return;
      }
      const applied = await setClassroomReteachWords(code, words);
      if (!applied) {
        refuse();
        return;
      }
      socket.emit('classroomReteachApplied', { gameCode: code, words: applied });
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Reteach failed for ${code}: ${error}`);
      refuse();
    }
  });
}

export default registerClassroomReteachHandlers;
