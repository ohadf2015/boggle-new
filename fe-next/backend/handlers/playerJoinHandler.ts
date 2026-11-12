/**
 * Player Join Handler
 * Handles player join, leave, and reconnection events
 */

import type { Server, Socket } from 'socket.io';
import type { Avatar } from '@/shared/types';

import {
  getGame,
  addUserToGame,
  getSocketIdByUsername,
  getGameUsers,
  getActiveRooms,
  addSpectatorToGame,
  getGameSpectators,
  restoreGameFromRedis,
  refreshRestoredGameFromRedis
} from '../modules/gameStateManager.js';

import {
  broadcastToRoom,
  broadcastActiveRooms,
  getGameRoom,
  joinRoom,
  leaveRoom,
  LOBBY_ROOM
} from '../utils/socketHelpers.js';

import { cancelAutoStartCountdown } from '../modules/lobbyAutoStart.js';
import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import { checkRateLimit, getIpFromSocket } from '../utils/rateLimiter.js';
import { isBlocked } from '../modules/blockListManager.js';
import { resumeGameTimerIfMissing } from '../services/gameLifecycle/gameTimer.js';
import { generateRandomAvatar } from '../utils/gameUtils.js';
import { answerMissingRoom } from './classroomMissingRoom.js';
import logger from '../utils/logger.js';
import { getAuthUserId } from '../utils/socialHelpers.js';
import { validatePayload, joinGameSchema } from '../utils/socketValidation.js';
import { emitClassroomContext } from '../modules/classroomGameContext.js';
import { broadcastRoomUsers } from './classroomUsersBroadcast.js';
import { checkClassroomSeat } from './classroomSeatGate.js';
import { MAX_PLAYERS_PER_ROOM } from '../utils/consts.js';
import { seatedPlayerCount } from '../modules/roomSeats.js';
import { isInProgress, shouldSendGameState } from '../utils/gameStateMachine.js';
import { notifyPlayerJoined } from '../modules/notificationService.js';
import {
  handleReconnection,
  handleLateJoin,
  handleTournamentJoin,
  handleExistingAuthConnectionJoin
} from './playerReconnectHandler';
import { recordClassroomRosterEntry } from '../modules/classroomRoster';
import { isLockedOut } from '../modules/classroomLobbyLock.js';
import { isGameStarting, waitForGameStart } from './gameStartMutex.js';
import { resolveJoinIdentity } from './playerJoinIdentity.js';
import { registerPlayerRoomExitHandlers } from './playerRoomExitHandlers.js';

// Types for payloads
interface JoinGamePayload {
  gameCode: string;
  username: string;
  playerId?: string;
  avatar?: Avatar;
  authUserId?: string;
  guestTokenHash?: string;
  guestSessionId?: string;
  practiceSeat?: boolean;
  hostSeat?: boolean;
}

/**
 * Register player join/leave socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerPlayerJoinHandlers(io: Server, socket: Socket): void {

  // Handle player joining
  const handlePlayerJoin = async (data: JoinGamePayload): Promise<void> => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = validatePayload(joinGameSchema, data);
    if (!validation.success) {
      // Typed (LOW severity → debug, not Sentry) — bad username is expected user
      // input, not a fault. Sentry JAVASCRIPT-NEXTJS-1MB/1MC/1MD.
      emitError(socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, { message: `Invalid request: ${validation.error}` });
      return;
    }

    let { gameCode, username, playerId, avatar, authUserId: clientAuthUserId, guestTokenHash, guestSessionId } = validation.data as JoinGamePayload;
    const wantsPracticeSeat = (validation.data as JoinGamePayload).practiceSeat === true;

    // Use server-verified user ID if available (from JWT middleware), ignore client-supplied value
    const verifiedUserId = (socket.data?.verifiedUserId as string | undefined) || undefined;
    let authUserId = verifiedUserId;
    if (clientAuthUserId && authUserId && clientAuthUserId !== authUserId) {
      logger.warn('SOCKET', `Auth ID mismatch for ${username}: client="${clientAuthUserId}" verified="${authUserId}"`);
    }

    logger.info('SOCKET', `Join request: ${username} to game ${gameCode}${authUserId ? ` (verified: ${authUserId})` : ' (guest)'}`);

    let game = getGame(gameCode);
    if (!game) {
      const restoredGame = await restoreGameFromRedis(gameCode);
      if (restoredGame) {
        game = restoredGame;
        logger.info('SOCKET', `Restored game ${gameCode} from Redis for join request`);
      } else {
        // No room. A classroom still on its "Join the game" screen is told to
        // wait (CLASSROOM_NOT_OPEN); everything else is GAME_NOT_FOUND.
        const opened = await answerMissingRoom(socket, gameCode, username, avatar, io);
        game = opened === 'opened' ? getGame(gameCode) ?? null : null;
        if (!game) return;
      }
    } else if (game.restoredFromRedis) {
      game = (await refreshRestoredGameFromRedis(gameCode)) ?? game;
    }

    // A join landing while the host's start is still dealing would read an in-progress room with no board yet.
    if (isGameStarting(gameCode)) {
      if (!(await waitForGameStart(gameCode))) logger.warn('SOCKET', `Join to ${gameCode} outlived its round start; the start broadcast will carry the board`);
      game = getGame(gameCode) ?? game;
    }

    // A server restart/redeploy wipes the in-memory setInterval game clock
    // (round countdown + word-hunt life drain) and bot loops while Redis keeps
    // the game state. Whichever path rehydrated this game (the sync getGame
    // above, or an async restore upstream), an in-progress game whose timer was
    // orphaned must have it resumed — otherwise the round is frozen: word-hunt
    // life stays pinned at its last value, the round never ends, and players
    // can still submit words (the "stuck at full life for everyone" report).
    // No-op for normal live reconnects (a timer is already running) and for
    // waiting/finished games — see resumeGameTimerIfMissing's guards.
    // Awaited so the dictionary is warm (bot solving + word validation) before
    // the resumed round runs.
    await resumeGameTimerIfMissing(io, gameCode);

    // The room exists — but a classroom room outlives its SESSION. Ask the one
    // seat gate every door uses, before anything seats this socket (reconnect
    // included, since the client re-emits `join` to rebuild the socket map).
    // No-op for ordinary multiplayer rooms; hands back the classroom record so
    // `emitClassroomContext` below reads Redis once, not twice.
    const seat = await checkClassroomSeat(socket, gameCode, 'multiplayer', typeof username === 'string' ? username : null);
    if (seat.refused) return;

    const identity = await resolveJoinIdentity(io, socket, game, gameCode, seat, {
      username, authUserId, guestTokenHash, verifiedUserId, wantsPracticeSeat,
      hostSeat: (validation.data as JoinGamePayload).hostSeat === true,
    });
    ({ username, authUserId, guestTokenHash } = identity);
    const { practiceSeat } = identity;

    // Block kicked players from re-joining
    if (game.kickedPlayers?.has(username)) {
      emitError(socket, ErrorCodes.PLAYER_KICKED, { message: 'You have been kicked from this room' });
      return;
    }

    // Global moderation blocklist (admin-issued): refuse the verified player
    // (auth user id), the guest (guest session id), or any client behind a
    // blocked IP. Checked here — before reconnection/late-join — so a blocked
    // user cannot reclaim a slot or rejoin under a new name.
    const blockMatch = await isBlocked({
      authUserId: verifiedUserId,
      guestSessionId,
      ip: getIpFromSocket(socket),
    });
    if (blockMatch) {
      logger.warn('SOCKET', `Blocked ${blockMatch.blockType} attempted to join ${gameCode} as ${username}`);
      emitError(socket, ErrorCodes.PLAYER_BLOCKED, {
        message: blockMatch.reason || 'You have been blocked from playing.',
      });
      return;
    }

    // Ranked rooms only admit the two matched auth ids from the ticket.
    if (game.isRanked && game.rankedAllowedUserIds && game.rankedAllowedUserIds.length > 0) {
      const verifiedJoinId = getAuthUserId(socket);
      if (!verifiedJoinId || !game.rankedAllowedUserIds.includes(verifiedJoinId)) {
        logger.warn('SOCKET', `Rejected ranked join ${gameCode}: user not on match ticket`);
        emitError(socket, ErrorCodes.AUTH_FORBIDDEN, {
          message: 'This ranked room is limited to the matched players',
        });
        return;
      }
    }

    // Block late joins for ranked games (use state machine helper)
    if (game.isRanked && isInProgress(game.gameState) && !game.allowLateJoin) {
      const existingSocketId = getSocketIdByUsername(gameCode, username);
      if (!existingSocketId) {
        emitError(socket, ErrorCodes.GAME_CLOSED, { message: 'Cannot join ranked game in progress' });
        return;
      }
    }

    // Same display name, different person: not a reconnect. Identities were already
    // normalised above (auth id / guest-token hash map back to their own seat), so a
    // mismatch here is a second student typing a taken name, who would otherwise
    // inherit the first one's score and silence their words.
    // A signed-in seat is never reclaimed without that account: a guest typing the
    // teacher's name would otherwise reconnect into the host seat (and its controls).
    const seated = game.users[username];
    if (
      seated &&
      ((seated.authUserId && authUserId && seated.authUserId !== authUserId) ||
        (seated.authUserId && !authUserId) ||
        (seated.guestTokenHash && guestTokenHash && seated.guestTokenHash !== guestTokenHash))
    ) {
      emitError(socket, ErrorCodes.PLAYER_USERNAME_TAKEN, { message: 'That name is already taken' });
      return;
    }

    if (isLockedOut(seat.game, { users: game.users, username, authUserId, guestTokenHash, hasSocket: !!getSocketIdByUsername(gameCode, username), inRound: isInProgress(game.gameState) })) {
      emitError(socket, ErrorCodes.ROOM_LOCKED);
      return;
    }

    // Classroom "late join: off" — the teacher's switch. A student already seated
    // may still reconnect; only a brand-new seat is refused mid-round.
    if (
      seat.game?.settings?.allowLateJoin === false &&
      isInProgress(game.gameState) &&
      !game.users[username] &&
      !getSocketIdByUsername(gameCode, username)
    ) {
      emitError(socket, ErrorCodes.GAME_CLOSED, { message: 'This game has already started' });
      return;
    }

    // Check for existing user (reconnection)
    const existingSocketId = getSocketIdByUsername(gameCode, username);

    if (!existingSocketId && seatedPlayerCount({ users: game.users, isClassroom: game.isClassroom || !!seat.game }) >= MAX_PLAYERS_PER_ROOM) {
      // Add as spectator
      const userAvatar = avatar || generateRandomAvatar();
      addSpectatorToGame(gameCode, username, socket.id, {
        avatar: userAvatar,
        authUserId: authUserId || null,
        guestTokenHash: guestTokenHash || null,
        guestSessionId: guestSessionId || null
      });

      joinRoom(socket, getGameRoom(gameCode));
      leaveRoom(socket, LOBBY_ROOM); // Stop receiving lobby broadcasts while in-game
      socket.emit('joinedAsSpectator', {
        success: true,
        gameCode,
        spectator: true,
        roomName: game.roomName,
        language: game.language,
        username
      });

      // Broadcast spectator list update
      broadcastToRoom(io, getGameRoom(gameCode), 'spectatorList', {
        spectators: getGameSpectators(gameCode)
      });

      if ((game.isClassroom || seat.game) && game.hostSocketId) {
        io.to(game.hostSocketId).emit('classroomSeatCapReached', { gameCode, username, cap: MAX_PLAYERS_PER_ROOM });
      }

      logger.info('SOCKET', `${username} joined as spectator in game ${gameCode}`);
      return;
    }

    // Per-student classroom context (differentiation level + lesson word bank).
    // Sits BEFORE the reconnect / new-user split so first join, late join and
    // reconnect all pass through this ONE call site — `startGame` is a room
    // broadcast and cannot carry a per-socket value (pitfalls class 3).
    // Fire-and-forget: it must never delay or fail the join.
    void emitClassroomContext(socket, gameCode, authUserId, seat);
    const rosterId = authUserId ?? (guestTokenHash ? `guest:${guestTokenHash}` : null);
    if (seat.game && !practiceSeat && rosterId) void recordClassroomRosterEntry(gameCode, seat.game, rosterId);

    // Handle reconnection
    if (existingSocketId || game.users[username]) {
      handleReconnection(io, socket, game, gameCode, username, authUserId, guestTokenHash);
      return;
    }

    // Add new user
    const userAvatar = avatar || generateRandomAvatar();
    logger.info('PLAYER_JOIN', `Adding user ${username} to game ${gameCode} with authUserId=${authUserId || 'NONE'}, guestHash=${guestTokenHash ? 'yes' : 'no'}`);
    addUserToGame(gameCode, username, socket.id, {
      avatar: userAvatar,
      isHost: false,
      playerId,
      authUserId: authUserId || null,
      guestTokenHash: guestTokenHash || null,
      guestSessionId: guestSessionId || null,
      isPractice: practiceSeat,
    });

    joinRoom(socket, getGameRoom(gameCode));
    leaveRoom(socket, LOBBY_ROOM); // Stop receiving lobby broadcasts while in-game

    // `gameInProgress` lets the client arm the lost-`startGame` safety-net for
    // late joiners (it already does this for reconnections). Without it, a
    // late-join `startGame` that races the client's listener registration is
    // lost silently → player stuck on a default grid while the real mode runs.
    const gameInProgress = shouldSendGameState(game.gameState) && !isGameStarting(gameCode);
    socket.emit('joined', {
      success: true,
      gameCode,
      isHost: false,
      username,
      roomName: game.roomName,
      language: game.language,
      isPrivate: game.isPrivate || false,
      users: getGameUsers(gameCode),
      gameInProgress
    });

    // If game is in progress, send current state (use state machine helper)
    if (gameInProgress) {
      handleLateJoin(socket, game, gameCode, username);
    }

    // Handle tournament join
    handleTournamentJoin(io, socket, gameCode, username, userAvatar);

    broadcastRoomUsers(io, gameCode);
    broadcastActiveRooms(io, getActiveRooms());

    // A newly-joined player starts un-ready, so the lobby auto-start's
    // all-ready condition no longer holds — cancel any in-flight countdown.
    // No-op when nothing is counting.
    if (game.gameState === 'waiting') {
      cancelAutoStartCountdown(gameCode, () =>
        broadcastToRoom(io, getGameRoom(gameCode), 'lobbyAutoStartCancelled', {})
      );
    }

    logger.info('SOCKET', `${username} joined game ${gameCode}`);

    // Fire-and-forget notification
    notifyPlayerJoined({
      gameCode,
      roomName: game.roomName,
      language: game.language,
      playerCount: Object.keys(game.users).length
    }, {
      username,
      isAuthenticated: !!authUserId
    }).catch(() => {}); // Swallow errors - never block game flow
  };
  // A throw used to leave the client waiting out its 10s join timeout with no answer.
  socket.on('join', (data: JoinGamePayload) => handlePlayerJoin(data).catch((error: unknown) => {
    logger.error('SOCKET', `Unhandled error in join handler: ${(error as Error)?.message ?? error}`, { socketId: socket.id });
    emitError(socket, ErrorCodes.INTERNAL_ERROR, { message: 'Failed to join game' });
  }));

  registerPlayerRoomExitHandlers(io, socket);

}

// Helper functions (handleReconnection, handleLateJoin, handleTournamentJoin, handleExistingAuthConnectionJoin)
// are in ./playerReconnectHandler.ts


export {
  registerPlayerJoinHandlers,
  handleReconnection,
  handleLateJoin,
  handleTournamentJoin,
  handleExistingAuthConnectionJoin
};

/** Test seam for the per-socket classroom context emit (word bank + level). */
export const emitClassroomContextForTest = emitClassroomContext;
