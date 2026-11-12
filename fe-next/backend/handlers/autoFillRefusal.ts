import type { Socket } from 'socket.io';
import type { AutoFillRefusalReason } from '@/shared/types/autoFillRefusal';

/** Answers a practice-bots fill that was not served, so the lobby can say why instead of timing out. */
export function refuseAutoFill(socket: Socket, reason: AutoFillRefusalReason): void {
  socket.emit('autoFillRefused', { reason });
}

/** Seated bots (an earlier practice run) already meet the target: success, unless no seat is free at all. */
export function answerNothingToFill(socket: Socket, hasFreeSeat: boolean): void {
  if (hasFreeSeat) socket.emit('autoFillComplete', { botsAdded: 0, alreadySeated: true });
  else refuseAutoFill(socket, 'room_full');
}
