import type { Socket } from 'socket.io';
import type { Language } from '@/shared/types';
import { getClassroomGame } from '../modules/classroomGameManager.js';
import { isClassroomSessionEnded } from '../modules/classroomGameSessionState.js';
import { reviveClassroomGameSession } from '../modules/classroomGameSession.js';

export type ClassroomHostDecision =
  | { allowed: false }
  | { allowed: true; isClassroom: boolean; isPrivate: boolean; recordLanguage?: Language; classroomId?: string; teacherId?: string };

/** Classroom status comes from the server's classroom record, never from the createGame payload. */
export async function decideClassroomHost(
  socket: Socket,
  gameCode: string,
  requestedPrivate: boolean
): Promise<ClassroomHostDecision> {
  const record = await getClassroomGame(gameCode);
  if (!record) return { allowed: true, isClassroom: false, isPrivate: requestedPrivate };

  const verifiedUserId = (socket.data as Record<string, unknown> | undefined)?.verifiedUserId;
  if (!verifiedUserId || verifiedUserId !== record.teacherId) return { allowed: false };

  // The host URL still has yesterday's code. Opening it has to make that code
  // a door again; leaving the Redis session ended is what told everyone the
  // game they were just handed had already expired.
  if (isClassroomSessionEnded(record)) {
    await reviveClassroomGameSession(gameCode, String(verifiedUserId));
  }

  return { allowed: true, isClassroom: true, isPrivate: true, recordLanguage: record.language, classroomId: record.classroomId, teacherId: record.teacherId };
}
