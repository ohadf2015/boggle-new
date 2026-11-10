/**
 * Who is on this classroom socket: the id the connect middleware verified from
 * the Supabase token, and nothing a client can type. A handshake `authUserId`
 * claim is never read; the current client never sends one.
 */

import type { Socket } from 'socket.io';
import logger from '../utils/logger.js';
import { CLASSROOM_IDENTITY_REFUSALS, type ClassroomIdentityRefusalCode } from '@/shared/constants/classroomIdentityRefusal';

function socketData(socket: Socket): Record<string, unknown> {
  return ((socket as { data?: unknown }).data as Record<string, unknown> | undefined) ?? {};
}

export function getAuthUserId(socket: Socket): string | null {
  const verified = socketData(socket).verifiedUserId;
  return typeof verified === 'string' && verified ? verified : null;
}

export type ClassroomIdentityRefusal = {
  error: string;
  code: ClassroomIdentityRefusalCode;
};

/** A token we could not verify is our problem to report, not "you are not the teacher". */
export function classroomIdentityRefusal(socket: Socket): ClassroomIdentityRefusal {
  const code: ClassroomIdentityRefusalCode = socketData(socket).authUnverified === true ? 'AUTH_UNVERIFIED' : 'AUTH_REQUIRED';
  return { error: CLASSROOM_IDENTITY_REFUSALS[code], code };
}

export function refuseUnidentified(socket: Socket, action: string, extra: Record<string, unknown> = {}, event = 'classroomGameError'): void {
  const refusal = classroomIdentityRefusal(socket);
  const claimed = (socket.handshake?.auth as Record<string, unknown> | undefined)?.authUserId;
  logger.warn('CLASSROOM_AUTH', `${action} refused ${refusal.code} for socket ${socket.id}${claimed ? ' (unverified id claim ignored)' : ''}`);
  socket.emit(event, { ...refusal, ...extra });
}

export default getAuthUserId;
