import type { Socket } from 'socket.io';
import { getAuthUserId } from './classroomSocketAuth.js';
import { buildClassroomJoinRefusedEvent, captureEduServerEvents } from '../utils/educationTelemetry';

/**
 * Turn a student away from a live classroom game, and leave a record that they
 * were turned away.
 *
 * The refusal itself is unchanged — several of these strings are deliberately
 * vague, and this must not make them less so. What changes is that the server
 * now writes down which gate fired. Before this, a student who could not get in
 * left no row and no event anywhere, which is why the 2026-09-14 report could
 * not be diagnosed at all. See `buildClassroomJoinRefusedEvent`.
 */
export function refuseClassroomJoin(
  socket: Socket,
  gameCode: string,
  reason: string,
  payload: Record<string, unknown>,
  classroomId: string | null
): void {
  socket.emit('classroomGameError', { ...payload, code: reason, gameCode });
  const event = buildClassroomJoinRefusedEvent({
    gameCode,
    classroomId,
    reason,
    door: 'classroomBanner',
    actorId: getAuthUserId(socket),
  });
  if (event) captureEduServerEvents([event]);
}
