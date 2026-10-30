import type { Socket } from 'socket.io';
import type { Language } from '@/shared/types';
import { getClassroomGame } from '../modules/classroomGameManager.js';

export type ClassroomHostDecision =
  | { allowed: false }
  | { allowed: true; isClassroom: boolean; isPrivate: boolean; recordLanguage?: Language };

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

  return { allowed: true, isClassroom: true, isPrivate: true, recordLanguage: record.language };
}
