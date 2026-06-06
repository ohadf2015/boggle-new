/**
 * Connection Handler
 * Handles disconnect events and connection cleanup
 */

import type { Server, Socket } from 'socket.io';
import type { Game, GameUser, ActiveRoom } from '@/shared/types';

import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  removeUserFromGame,
  getGameUsers,
  getActiveRooms,
  deleteGame,
  isRoomEmpty,
  getNextEligibleHost,
  transferHost,
  upgradeSpectatorToPlayer,
  getGameSpectators,
} from '../modules/gameStateManager.js';

import {
  broadcastToRoom,
  broadcastActiveRooms,
  getGameRoom,
} from '../utils/socketHelpers.js';

import timerManager, { clearGameTimer } from '../utils/timerManager.js';
import { resetRateLimit } from '../utils/rateLimiter.js';
import { cleanupPlayerData } from '../utils/playerCleanup.js';
import { cleanupGameBots } from '../modules/botManager.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import { startGameTimer } from '../services/gameLifecycle/gameTimer.js';
import { buildMpDropEvent, buildHostLeftDropEvents } from '../utils/mpDropTelemetry.js';
import { getPostHogServer } from '@/lib/posthog';
import logger from '../utils/logger.js';

// Configuration
// Host grace defaults to 5 minutes so a backgrounded Chrome tab / locked phone
// does not tear down the host's room. Periodic empty-room sweep
// (gameStateManager.cleanupEmptyRooms) reads the same env var to stay in sync.
const HOST_RECONNECTION_GRACE_PERIOD = parseInt(process.env.HOST_RECONNECTION_GRACE_PERIOD || '300000');
// Player grace stays at 2 min for now. Extending it (to reduce permanent drops on
// a mid-game network switch) is deliberately HELD until `mp_player_dropped`
// telemetry establishes a baseline — changing removal behavior and measuring it in
// the same release would contaminate the very signal we're adding. Env-overridable.
const PLAYER_RECONNECTION_GRACE_PERIOD = parseInt(process.env.PLAYER_RECONNECTION_GRACE_PERIOD || '120000');

// Extended GameUser type with reconnection timeout
interface GameUserWithTimeout extends GameUser {
  reconnectionTimeout?: ReturnType<typeof setTimeout>;
}

/**
 * Register connection-related socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerConnectionHandlers(io: Server, socket: Socket): void {

  // Handle disconnect
  socket.on('disconnect', (reason: string) => {
    // Clean up migration timeout if set (prevents timer accumulation)
    if (socket.data?.migrationTimeout) {
      clearTimeout(socket.data.migrationTimeout);
      delete socket.data.migrationTimeout;
    }

    // Skip if this socket was migrating (multi-tab scenario)
    if (socket.data && socket.data.migrating) {
      logger.debug('SOCKET', `Socket ${socket.id} disconnect skipped (was migrating)`);
      return;
    }

    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    // Ping timeout is the most common cause of mid-game disconnections
    // (mobile sleep, network switch, poor WiFi). Log at warn for visibility.
    if (reason === 'ping timeout') {
      logger.warn('SOCKET', `Socket ${socket.id} ping timeout${gameCode ? ` in game ${gameCode} (user: ${username})` : ''} — client didn't respond within pingTimeout`);
    } else {
      logger.info('SOCKET', `Socket ${socket.id} disconnected (reason: ${reason})${gameCode ? ` from game ${gameCode}` : ''}`);
    }

    // Clean up rate limiting
    resetRateLimit(socket.id);

    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Check if this is the host disconnecting
    // Type assertion needed: GameState and Game have slightly different type definitions
    if (game.hostSocketId === socket.id) {
      handleHostDisconnect(io, socket, game as unknown as Game, gameCode, username || 'Unknown', reason);
    } else if (username) {
      handlePlayerDisconnect(io, socket, game as unknown as Game, gameCode, username, reason);
    }
  });
}

/**
 * Handle host disconnection
 * Attempts to transfer host to another player, only closes room if no eligible players
 */
function handleHostDisconnect(io: Server, socket: Socket, game: Game, gameCode: string, username: string, _reason: string): void {
  logger.info('SOCKET', `Host (${username}) disconnected from game ${gameCode}`);

  // Clear any existing host reconnection timeout to prevent double-fire.
  // Note: hostManager.transferHost() also clears this timer on successful
  // transfer mid-grace — both calls are intentional, covering different
  // lifecycle points (this one kills a prior-flap timer; that one cancels
  // the timer this handler is about to schedule).
  timerManager.clearTimer(`hostReconnect:${gameCode}`);

  // Notify game start coordinator so ack sequence adjusts for the missing player
  const hostCoordResult = gameStartCoordinator.handlePlayerDisconnect(gameCode, username);
  if (hostCoordResult && hostCoordResult.startTimer) {
    startGameTimer(io, gameCode, game.gameDuration || game.timerSeconds || 180);
  }

  // Mark host as disconnected BEFORE checking if room is empty
  // This ensures isRoomEmpty correctly counts the disconnecting host as inactive
  if (game.users[username]) {
    game.users[username].disconnected = true;
    game.users[username].disconnectedAt = Date.now();
  }

  // NOTE: previously we deleted the room immediately when the host was the
  // last active user (`isRoomEmpty(gameCode)`). That made backgrounding Chrome
  // / locking the phone instantly destroy the room — even though the user
  // never explicitly closed it. Now we always fall through to the grace-period
  // path: getNextEligibleHost will return null for solo rooms, so the existing
  // grace-timer block schedules a delayed close, giving the host a chance to
  // reconnect within HOST_RECONNECTION_GRACE_PERIOD.

  // Audit T4/T5/T6 (2026-05-10): three modes must NOT auto-transfer host —
  //   - classroom: prevents student silent-promotion to teacher authority
  //   - tournament: tournamentManager state is host-bound, won't reconcile
  //   - ranked: MMR / match outcome is tied to the original host's session
  // For all three, skip the transfer loop and let the grace-period path run.
  // The original host can still reclaim host on reconnect.
  const allowAutoTransfer = !game.isClassroom && !game.isRanked && !game.tournamentId;

  // Try to find a new host from remaining connected players.
  // Retry up to 3 distinct candidates in case any of them disconnect between
  // selection and transfer (or transferHost fails for race-condition reasons).
  // Audit T1 (2026-05-10): pass a growing exclude-list so attempts 2/3 select
  // a DIFFERENT candidate; previously the duplicate-check would short-circuit
  // the loop because getNextEligibleHost only knew to exclude the leaving host.
  let hostTransferred = false;
  const triedCandidates: string[] = [];
  const MAX_HOST_TRANSFER_ATTEMPTS = allowAutoTransfer ? 3 : 0;
  for (let attempt = 0; attempt < MAX_HOST_TRANSFER_ATTEMPTS; attempt++) {
    const nextHost = getNextEligibleHost(gameCode, [username, ...triedCandidates]);
    if (!nextHost) break;
    triedCandidates.push(nextHost);

    const transferResult = transferHost(gameCode, nextHost);
    if (transferResult.success) {
      logger.info('SOCKET', `Host transferred in game ${gameCode}: ${username} -> ${nextHost}`);

      broadcastToRoom(io, getGameRoom(gameCode), 'hostTransferred', {
        previousHost: username,
        newHost: nextHost,
        message: `${username} left. ${nextHost} is now the host.`,
        i18nKey: 'multiplayerFlow.hostTransferredAnnouncement',
        i18nParams: { previousHost: username, newHost: nextHost }
      });

      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode) as GameUser[]
      });

      broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
      hostTransferred = true;
      break;
    } else {
      logger.warn('SOCKET', `Failed to transfer host in game ${gameCode} to ${nextHost}: ${transferResult.error}, retrying...`);
    }
  }

  if (hostTransferred) return;

  // Audit T2 (2026-05-10): no eligible USER, but a spectator might be willing.
  // Promote first available spectator (subject to same mode guards as the user
  // transfer). Common in invite-link rooms where late joiners hit
  // MAX_PLAYERS_PER_ROOM and silently land in the spectator slot.
  if (allowAutoTransfer) {
    const spectators = getGameSpectators(gameCode) || [];
    for (const spectator of spectators) {
      const specName = spectator.username;
      if (!specName) continue;
      const upgraded = upgradeSpectatorToPlayer(gameCode, specName);
      if (!upgraded) continue;
      const transferResult = transferHost(gameCode, specName);
      if (transferResult.success) {
        logger.info('SOCKET', `Spectator ${specName} promoted to host in game ${gameCode}`);
        broadcastToRoom(io, getGameRoom(gameCode), 'hostTransferred', {
          previousHost: username,
          newHost: specName,
          message: `${username} left. ${specName} is now the host.`,
          i18nKey: 'multiplayerFlow.hostTransferredAnnouncement',
          i18nParams: { previousHost: username, newHost: specName }
        });
        broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
          users: getGameUsers(gameCode) as GameUser[]
        });
        broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
        return;
      }
      // upgrade succeeded but transfer didn't — leave them as a regular user
      // (better than rolling back) and continue trying next spectator.
      logger.warn('SOCKET', `Spectator ${specName} upgraded but transferHost failed: ${transferResult.error}`);
    }
  }

  // No eligible player found for host transfer - use grace period before closing
  logger.info('SOCKET', `No eligible host found for game ${gameCode}, starting grace period`);

  // Notify players that host disconnected
  broadcastToRoom(io, getGameRoom(gameCode), 'hostDisconnected', {
    message: 'Host disconnected. Waiting for reconnection...',
    gracePeriodMs: HOST_RECONNECTION_GRACE_PERIOD,
    i18nKey: 'playerView.hostDisconnected',
    i18nParams: { host: username }
  });

  // Start grace period for host reconnection
  timerManager.setTimeout(`hostReconnect:${gameCode}`, () => {
    try {
      const currentGame = getGame(gameCode);
      if (!currentGame) return;

      // Check if host is still disconnected (socket hasn't changed)
      if (currentGame.hostSocketId === socket.id) {
        // Audit T4/T5/T6 (2026-05-10): skip the final transfer attempt for
        // classroom / ranked / tournament rooms — close the room instead of
        // promoting a different player into a host-bound role.
        const skipTransfer = currentGame.isClassroom || currentGame.isRanked || !!currentGame.tournamentId;
        const finalNextHost = skipTransfer ? null : getNextEligibleHost(gameCode, username);

        if (finalNextHost) {
          const finalTransferResult = transferHost(gameCode, finalNextHost);
          if (finalTransferResult.success) {
            broadcastToRoom(io, getGameRoom(gameCode), 'hostTransferred', {
              previousHost: username,
              newHost: finalNextHost,
              message: `${username} did not reconnect. ${finalNextHost} is now the host.`,
              i18nKey: 'multiplayerFlow.hostTransferredAfterGrace',
              i18nParams: { previousHost: username, newHost: finalNextHost }
            });
            broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
              users: getGameUsers(gameCode) as GameUser[]
            });
            broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
            return;
          }
        }

        logger.info('SOCKET', `Host reconnection timeout for game ${gameCode} - closing room`);

        // Instrument the host-drop cascade BEFORE deleteGame: every remaining
        // human is kicked here and their own disconnect will find no game, so
        // this is the ONLY place this "many players leave at once" path is
        // visible. source='host_left' keeps it in the same funnel as solo drops.
        // Best-effort: telemetry must never block room teardown.
        try {
          const hostLeftDrops = buildHostLeftDropEvents(currentGame as unknown as Game, Date.now());
          const ph = getPostHogServer();
          if (ph) for (const drop of hostLeftDrops) ph.capture(drop);
        } catch (telemetryErr) {
          logger.warn('SOCKET', `host_left telemetry failed for ${gameCode}: ${(telemetryErr as Error).message}`);
        }

        // Stop timer and bots
        clearGameTimer(gameCode);
        cleanupGameBots(gameCode);

        // Notify all players
        broadcastToRoom(io, getGameRoom(gameCode), 'hostLeftRoomClosing', {
          message: 'Host did not reconnect. Room is closing.',
          i18nKey: 'multiplayerFlow.hostLeftReason.graceExpired',
          i18nParams: { host: username },
          reason: 'grace_expired'
        });

        // Clean up game
        deleteGame(gameCode);
        broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
      }
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('SOCKET', `Error in host reconnection timeout for ${gameCode}: ${err.message}`);
    }
  }, HOST_RECONNECTION_GRACE_PERIOD);

  logger.debug('SOCKET', `Started ${HOST_RECONNECTION_GRACE_PERIOD}ms reconnection timer for host in game ${gameCode}`);
}

/**
 * Handle player disconnection
 */
function handlePlayerDisconnect(io: Server, _socket: Socket, game: Game, gameCode: string, username: string, reason: string): void {
  logger.info('SOCKET', `Player ${username} disconnected from game ${gameCode}`);

  // Check if user is a bot (bots don't have reconnection handling)
  const userData: GameUserWithTimeout | undefined = game.users?.[username];
  if (userData?.isBot) {
    // Remove bot immediately
    removeUserFromGame(gameCode, username);

    // Check if room is now empty and close it immediately
    if (isRoomEmpty(gameCode)) {
      logger.info('SOCKET', `Room ${gameCode} is empty after bot ${username} removed - closing immediately`);
      clearGameTimer(gameCode);
      cleanupGameBots(gameCode);
      deleteGame(gameCode);
      broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
      return;
    }

    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode) as GameUser[]
    });
    return;
  }

  // Notify game start coordinator so ack sequence adjusts for the missing player
  const playerCoordResult = gameStartCoordinator.handlePlayerDisconnect(gameCode, username);
  if (playerCoordResult && playerCoordResult.startTimer) {
    startGameTimer(io, gameCode, game.gameDuration || game.timerSeconds || 180);
  }

  // Mark user as disconnected but don't remove yet (allow reconnection)
  if (game.users[username]) {
    game.users[username].disconnected = true;
    game.users[username].disconnectedAt = Date.now();

    // NOTE: previously we deleted the room immediately when this was the last
    // active player (`isRoomEmpty(gameCode)`). That defeated the reconnection
    // grace — a transient mobile disconnect destroyed the room, so the
    // reconnecting socket hit GAME_NOT_FOUND ("room closed/inactive"). The host
    // path already grace-closes (see handleHostDisconnect); mirror it here.
    // Always arm the grace timer below; its expiry removes the player and
    // deletes the room only if it is STILL empty. Explicit `leaveRoom` (the
    // user pressed Exit) keeps its immediate teardown in playerJoinHandler —
    // that's an intentional exit, not a transient drop.
    if (isRoomEmpty(gameCode)) {
      // Drop it from the lobby's joinable list right away (getActiveRooms
      // excludes empty rooms) so nobody taps a room with nobody in it.
      broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
    } else {
      // Room still has active players - notify them someone dropped.
      broadcastToRoom(io, getGameRoom(gameCode), 'playerDisconnected', {
        username,
        message: `${username} disconnected. Waiting for reconnection...`
      });
    }

    // Start player reconnection grace period
    timerManager.setTimeout(`reconnect:${gameCode}:${username}`, () => {
      try {
        const currentGame = getGame(gameCode);
        if (!currentGame) return;

        const currentUserData: GameUserWithTimeout | undefined = currentGame.users?.[username] as unknown as GameUserWithTimeout | undefined;
        if (currentUserData && currentUserData.disconnected) {
          logger.info('SOCKET', `Player ${username} reconnection timeout - removing from game ${gameCode}`);

          // Instrument the mid-game leave BEFORE removal (player still counted in
          // human seats). This is the only place MP dropout is measurable —
          // PostHog never fired game_abandoned for MP and server logs are
          // ephemeral. `reason` (ping timeout / transport close / io client
          // disconnect) separates a connectivity bug from an intentional leave.
          // Best-effort: never let telemetry throw into the cleanup path.
          // Use disconnectedAt — the moment the player actually dropped — NOT now:
          // this callback fires a full grace period (~2min) later, which would
          // otherwise inflate every durationSec past the grace and hide rage-quits.
          try {
            const droppedAt = currentUserData.disconnectedAt ?? Date.now();
            const drop = buildMpDropEvent(currentGame as unknown as Game, username, reason, droppedAt);
            getPostHogServer()?.capture(drop);
          } catch (telemetryErr) {
            logger.warn('SOCKET', `mp_player_dropped telemetry failed for ${username} in ${gameCode}: ${(telemetryErr as Error).message}`);
          }

          // Clean up player data
          cleanupPlayerData(currentGame, username);
          removeUserFromGame(gameCode, username);

          // Check if room is now empty and close it immediately
          if (isRoomEmpty(gameCode)) {
            logger.info('SOCKET', `Room ${gameCode} is empty after ${username} timeout - closing immediately`);
            clearGameTimer(gameCode);
            cleanupGameBots(gameCode);
            deleteGame(gameCode);
            broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
            return;
          }

          // Notify remaining players
          broadcastToRoom(io, getGameRoom(gameCode), 'playerLeft', {
            username,
            message: `${username} did not reconnect and was removed.`
          });

          broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
            users: getGameUsers(gameCode) as GameUser[]
          });

          broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
        }
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('SOCKET', `Error in player reconnection timeout for ${username} in ${gameCode}: ${err.message}`);
      }
    }, PLAYER_RECONNECTION_GRACE_PERIOD);

    logger.debug('SOCKET', `Started ${PLAYER_RECONNECTION_GRACE_PERIOD}ms reconnection timer for ${username} in game ${gameCode}`);
  }
}

export { registerConnectionHandlers };
