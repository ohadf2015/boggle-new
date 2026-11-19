import type { Socket } from 'socket.io';
import type { Language } from '@/shared/types';
import { getClassroomGame } from '../modules/classroomGameManager.js';
import { isClassroomSessionEnded } from '../modules/classroomGameSessionState.js';

export type ClassroomHostDecision =
  | { allowed: false; reason: 'not_teacher' | 'ended' }
  | { allowed: true; isClassroom: boolean; isPrivate: boolean; recordLanguage?: Language; classroomId?: string; teacherId?: string };

/**
 * Classroom status comes from the server's classroom record, never from the
 * createGame payload.
 *
 * An ended record must not be allowed to mint a new live room under the same
 * PIN. After the waiting-room host leaves, deleteGame tears the socket room
 * down and the Redis record stays `ended` for the 4h TTL. createGame used to
 * treat "not in memory" as a free code, so a stale tab or ?room= link
 * resurrected the expired PIN (prod 2026-11-19, teacher reopened 4BH936
 * seventeen seconds after it had moved to a new game).
 */
export async function decideClassroomHost(
  socket: Socket,
  gameCode: string,
  requestedPrivate: boolean
): Promise<ClassroomHostDecision> {
  const record = await getClassroomGame(gameCode);
  if (!record) return { allowed: true, isClassroom: false, isPrivate: requestedPrivate };

  if (isClassroomSessionEnded(record)) return { allowed: false, reason: 'ended' };

  const verifiedUserId = (socket.data as Record<string, unknown> | undefined)?.verifiedUserId;
  if (!verifiedUserId || verifiedUserId !== record.teacherId) return { allowed: false, reason: 'not_teacher' };

  return { allowed: true, isClassroom: true, isPrivate: true, recordLanguage: record.language, classroomId: record.classroomId, teacherId: record.teacherId };
}
