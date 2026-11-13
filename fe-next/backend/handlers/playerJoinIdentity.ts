/**
 * Who a `join` seats: the classroom practice-seat / teacher-second-page decision,
 * then account and guest-token matching back to an existing seat, then the
 * classroom seat-name rules. Moved out of playerJoinHandler unchanged.
 */

import type { Server, Socket } from 'socket.io';
import type { GameState } from '../modules/gameState/types.js';
import { getSocketById } from '../utils/socketHelpers.js';
import logger from '../utils/logger.js';
import { handleExistingAuthConnectionJoin } from './playerReconnectHandler';
import { inClassroomElsewhere } from './classroomHostElsewhere';
import { classroomSeatName, cleanClassroomSeatName } from './classroomSeatName';
import { practiceSeatToken } from './practiceSeat';
import { suggestAvailableGuestName } from '@/lib/education/guestNameCollision';
import type { ClassroomSeat } from './classroomSeatGate.js';

export interface JoinIdentityInput {
  username: string;
  authUserId: string | undefined;
  guestTokenHash: string | undefined;
  verifiedUserId: string | undefined;
  wantsPracticeSeat: boolean;
  hostSeat: boolean;
}

export interface JoinIdentity {
  username: string;
  authUserId: string | undefined;
  guestTokenHash: string | undefined;
  practiceSeat: boolean;
}

export async function resolveJoinIdentity(
  io: Server,
  socket: Socket,
  game: GameState,
  gameCode: string,
  seat: ClassroomSeat,
  input: JoinIdentityInput,
): Promise<JoinIdentity> {
  let { username, authUserId, guestTokenHash } = input;
  const { verifiedUserId, wantsPracticeSeat } = input;

  // A practice seat is the teacher trying the student side of their own classroom
  // room, from a frame beside the board, another tab or their phone, often on the
  // same account as the host seat. It sits as an anonymous seat keyed by its own
  // token, so it never reaches the account reconnect below (which would take over
  // the host seat), never registers as that account's connection, and is left out
  // of the class's students. Ordinary multiplayer rooms ignore the flag.
  // The teacher's own account arriving from a non-host page (the invite link opened
  // in another tab, their phone) while the board is live would otherwise take the
  // host seat over and leave the board dead: seat it as the practice seat instead.
  const isOwnClassroomTeacher = !!seat.game && !!verifiedUserId && verifiedUserId === seat.game.teacherId && !input.hostSeat;
  const teacherSecondPage = isOwnClassroomTeacher && !!game.hostSocketId && game.hostSocketId !== socket.id && !!getSocketById(io, game.hostSocketId)?.connected;
  const practiceSeat = (wantsPracticeSeat || teacherSecondPage) && !!seat.game;
  if (teacherSecondPage && !wantsPracticeSeat && game.users[username]) {
    username = suggestAvailableGuestName(username, new Set(Object.keys(game.users))).name;
  }
  if (teacherSecondPage) logger.info('SOCKET', `Teacher ${verifiedUserId} opened ${gameCode} on a second page while hosting; seating it as the practice seat`);
  if (practiceSeat) {
    guestTokenHash = practiceSeatToken(verifiedUserId, guestTokenHash, socket.id);
    authUserId = undefined;
  }

  if (!seat.game && inClassroomElsewhere(io, socket, authUserId, gameCode)) {
    logger.info('SOCKET', `Account ${authUserId} sits in a classroom game; seating ${gameCode} without the account so the class seat stays`);
    authUserId = undefined;
  }

  // Handle multi-tab detection and existing auth connection
  if (authUserId) {
    const authResult = await handleExistingAuthConnectionJoin(io, socket, authUserId, gameCode, username);
    // If user is reconnecting to same game, use their existing username to prevent duplicates
    if (authResult.handled && authResult.existingUsername) {
      logger.info('SOCKET', `Using existing username "${authResult.existingUsername}" instead of "${username}" for auth user reconnection`);
      username = authResult.existingUsername;
    }
  } else if (guestTokenHash) {
    // A returning guest who picks a different name would miss the username
    // lookup and lose their seat (and host status): match the token hash.
    for (const [existingName, user] of Object.entries(game.users)) {
      if (user.guestTokenHash && user.guestTokenHash === guestTokenHash) {
        if (existingName !== username) {
          logger.info('SOCKET', `Guest reconnect by tokenHash: "${username}" → existing slot "${existingName}" in game ${gameCode}`);
          username = existingName;
        }
        break;
      }
    }
  }
  if (seat.game && authUserId) username = classroomSeatName(game.users, username, authUserId);
  if (seat.game && !practiceSeat && authUserId !== seat.game.teacherId) username = cleanClassroomSeatName(game.users, username, { authUserId, guestTokenHash }, game.language);

  return { username, authUserId, guestTokenHash, practiceSeat };
}
