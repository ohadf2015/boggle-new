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
 * id is already the room's host. A student's socket, another teacher's socket
 * and an unauthenticated socket fall through to the caller's existing error;
 * the payload's auth id is never read. Guest-hosted rooms have no auth id to
 * match and are refused too.
 */

import type { Server, Socket } from 'socket.io';

import { getGame } from '../modules/gameStateManager.js';
import { handleReconnection } from './playerReconnectHandler.js';
import { getSocketById } from '../utils/socketHelpers.js';
import { parkSameConnectionGhost } from './sameConnectionGhost.js';
import logger from '../utils/logger.js';

export interface HostReclaimRequest {
  gameCode: string;
  /** Auth id as claimed by the client payload. Ignored: only the socket's verified id counts. */
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

  // A reload emits before client sign-in resolves (payload authUserId null), so only the middleware-verified id decides.
  const verifiedUserId = socket.data?.verifiedUserId as string | undefined;
  if (!verifiedUserId) return false;

  const hostUsername = game.hostUsername;
  if (!hostUsername) return false;

  const hostUser = game.users?.[hostUsername];
  if (!hostUser?.authUserId) return false;
  if (hostUser.authUserId !== verifiedUserId) return false;

  // Takeover guard: a second LIVE page of the same teacher (projector +
  // laptop, a duplicated tab, the refused-frame's retry) re-emits createGame
  // too. Handing it the seat here would flip hostSocketId off the board that
  // is still connected and silently dead every teacher control on it — they
  // all gate on `game.hostSocketId === socket.id` — while the class watches a
  // frozen wall (race 3a1508b5, 2026-11-13 round-3 audit). The join path
  // seats this page as the practice seat instead (teacherSecondPage in
  // playerJoinIdentity); the create path has no practice seat to offer, so it
  // refuses and lets the duplicate fall through to GAME_ALREADY_EXISTS — the
  // client shows its "room already open" frame while the live board keeps
  // hosting. A genuinely dead host socket (reload, network blip) fails the
  // connected check and the reclaim proceeds as before; a same-connection
  // ghost is parked, not obeyed.
  const currentHostSocketId = game.hostSocketId;
  if (currentHostSocketId && currentHostSocketId !== socket.id) {
    const currentHostSocket = getSocketById(io, currentHostSocketId);
    if (currentHostSocket?.connected && !parkSameConnectionGhost(currentHostSocket, socket)) {
      logger.info(
        'HOST',
        `Refused host-seat takeover in ${gameCode}: the live host socket is still connected`,
        { socketId: socket.id, hostSocketId: currentHostSocketId, gameCode }
      );
      return false;
    }
  }

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
