import type { Socket } from 'socket.io';
import type { AutoFillRefusalReason } from '@/shared/types/autoFillRefusal';

/** The one answer to a fill that was not served, so the lobby can say why instead of timing out. */
export function refuseAutoFill(socket: Socket, reason: AutoFillRefusalReason): void {
  socket.emit('autoFillRefused', { reason });
}

interface FillUser {
  isBot?: boolean;
  isHost?: boolean;
  isPractice?: boolean;
  disconnected?: boolean;
}

export type AutoFillPlan =
  | { kind: 'refuse'; reason: AutoFillRefusalReason }
  | { kind: 'none'; alreadySeated: boolean }
  | { kind: 'add'; count: number };

/**
 * How many bots a fill adds. The teacher's practice seat is a spectator of sorts, so it
 * never takes a bot's place. A classroom peek with real students present would start
 * their lesson, so it is refused; bots left from an earlier practice run alone are a ready practice round.
 */
export function planAutoFill(
  game: { isClassroom?: boolean; users: Record<string, FillUser> },
  targetCount: number,
  maxPlayers: number,
): AutoFillPlan {
  const present = Object.values(game.users).filter((u) => !u.isPractice && !u.disconnected);
  const realStudents = present.filter((u) => !u.isBot && !u.isHost).length;
  if (game.isClassroom && realStudents > 0) return { kind: 'refuse', reason: 'students_present' };
  const count = Math.min(targetCount - present.length, maxPlayers - present.length);
  if (count > 0) return { kind: 'add', count };
  if (maxPlayers - present.length <= 0) return { kind: 'refuse', reason: 'room_full' };
  return { kind: 'none', alreadySeated: realStudents === 0 && present.some((u) => u.isBot) };
}
