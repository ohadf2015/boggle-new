/**
 * Classroom host seat reclaim
 *
 * The classroom host boot path (`/multiplayer?room=X&classroom=true&host=true`)
 * only knows how to CREATE a room. Every re-entry into it — a projector reload,
 * a socket reconnect after a network blip, a restored tab — re-emits
 * `createGame` with the SAME code. The server answered GAME_ALREADY_EXISTS, the
 * client's `codeExists` branch flipped `isActive` off, and the teacher landed
 * on the Arena Hub with the lesson still running behind them. Because the
 * socket was never seated, `getGameBySocketId` stayed null and every later
 * teacher control logged "endRoundNow ignored: socket not in a game" — a silent
 * dead END ROUND button (`.claude/rules/60-recurring-pitfalls.md` Class 4).
 *
 * This is the second door to the same state as an ordinary `join` reconnect
 * (Class 3: two paths, one outcome). It deliberately does NOT re-implement
 * seating — it delegates to `handleReconnection`, the exact function the
 * `join` door uses, so both doors restore host socket id, room membership,
 * board state and leaderboard from one payload.
 *
 * Security: the seat is returned ONLY to a socket whose *server-verified* auth
 * id is already the room's host. A student's socket, an unauthenticated socket,
 * and a payload claiming an id the socket has not verified all fall through to
 * the caller's existing error. Guest-hosted rooms have no auth id to match and
 * are refused too.
 */

import type { Server, Socket } from 'socket.io';

import { getGame } from '../modules/gameStateManager.js';
import { handleReconnection } from './playerReconnectHandler.js';
import logger from '../utils/logger.js';

export interface HostReclaimRequest {
  gameCode: string;
  /** Auth id as claimed by the client payload — cross-checked, never trusted. */
  authUserId?: string | null;
  /** Display name from the payload. Ignored for seating; kept for logs. */
  hostUsername?: string | null;
}

/**
 * Try to hand an existing classroom room back to the teacher who hosts it.
 *
 * @returns true when the socket has been re-seated as host (the caller must
 *          NOT also emit an error), false when the caller should fall through
 *          to its normal "code already exists" rejection.
 */
export function tryReclaimClassroomHostSeat(
  io: Server,
  socket: Socket,
  request: HostReclaimRequest
): boolean {
  const { gameCode } = request;

  const game = getGame(gameCode);
  if (!game) return false;

  // Ordinary arcade rooms keep the existing dedup behaviour: a double-tapped
  // Create there is a genuine mistake, and arcade hosts have no equivalent
  // boot-path-only re-entry.
  if (!game.isClassroom) return false;

  // socket.data.verifiedUserId is set by the socket auth middleware from a
  // validated token. The payload's authUserId is client-supplied; requiring
  // both to agree means a forged payload proves nothing.
  const verifiedUserId = socket.data?.verifiedUserId as string | undefined;
  if (!verifiedUserId) return false;
  if (!request.authUserId || request.authUserId !== verifiedUserId) return false;

  const hostUsername = game.hostUsername;
  if (!hostUsername) return false;

  const hostUser = game.users?.[hostUsername];
  if (!hostUser?.authUserId) return false;
  if (hostUser.authUserId !== verifiedUserId) return false;

  logger.info(
    'HOST',
    `Classroom host ${hostUsername} reclaimed room ${gameCode} via the create path (re-entry, not a new room)`,
    { socketId: socket.id, gameCode }
  );

  // Seat under the ROOM's host username, not the payload's display name: a
  // teacher who renamed themselves between rounds must land back in their own
  // seat rather than opening a second one.
  handleReconnection(io, socket, game, gameCode, hostUsername, verifiedUserId, undefined);

  return true;
}
