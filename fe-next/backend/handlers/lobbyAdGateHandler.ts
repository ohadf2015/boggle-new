/**
 * Lobby Ad-Gate Handler
 *
 * Relays "this player is watching a rewarded ad while in the lobby" presence to
 * the rest of the room. The host's Start button disables while anyone is mid-ad
 * — starting the game then would tear a watcher out of their ad and void the
 * granted reward (coins / avatar part). The same relay covers the results
 * screen ('finished': the host's between-games interstitial) and mid-round
 * rewarded ads ('playing') — anywhere a fullscreen ad can own the player.
 *
 * Transient relay (no GameState persistence, like lobbyEmoteHandler). Watchers
 * are keyed by socket id so a disconnect mid-ad clears the flag and
 * rebroadcasts — Start can never wedge on a dropped watcher. The client always
 * emits active=false on every ad-end path too.
 *
 * A disconnect mid-ad ALSO leaves a short grace marker (wasRecentAdWatcher):
 * connectionHandler reads it to give a host whose socket died under a
 * fullscreen ad the reconnection-grace path instead of an instant host
 * transfer (the "ad between games → disconnected" report). The marker is
 * separate from the UI gate so Start unwedges immediately while the seat is
 * still held. Listener registration order between this handler and
 * connectionHandler is irrelevant — the marker survives this handler's own
 * disconnect cleanup.
 */
import type { Server, Socket } from 'socket.io';
import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
} from '../modules/gameStateManager';
import { getGameRoom } from '../utils/socketHelpers';
import { checkRateLimit } from '../utils/rateLimiter';
import { inc } from '../utils/metrics';
import { isSocketMigrating } from './shared';

const AD_GATE_WEIGHT = 1;

/** An ad runs ≤60s; 2min covers a slow reconnect without outliving its purpose. */
const AD_WATCHER_GRACE_TTL_MS = 2 * 60 * 1000;

// gameCode -> (socketId -> username). Socket-keyed so disconnect cleanup is O(1)
// and a refresh/new socket for the same user can't leave a stale entry.
const adWatchersByGame = new Map<string, Map<string, string>>();
// socketId -> gameCode, so disconnect can find the room without the (possibly
// already-cleared) socket→game mapping in gameStateManager.
const gameBySocket = new Map<string, string>();
// socketId -> expiry timer, set when a watcher disconnects mid-ad.
const adWatcherGraceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Test-only: reset module state between cases. */
export function __resetLobbyAdGateState(): void {
  adWatchersByGame.clear();
  gameBySocket.clear();
  for (const t of adWatcherGraceTimers.values()) clearTimeout(t);
  adWatcherGraceTimers.clear();
}

/**
 * Did this socket disconnect while a fullscreen ad was on its screen (within
 * the grace TTL)? connectionHandler uses this to hold the host's seat.
 */
export function wasRecentAdWatcher(socketId: string): boolean {
  return adWatcherGraceTimers.has(socketId);
}

function armAdWatcherGrace(socketId: string): void {
  const existing = adWatcherGraceTimers.get(socketId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    adWatcherGraceTimers.delete(socketId);
  }, AD_WATCHER_GRACE_TTL_MS);
  // Never hold the process open for a grace marker.
  (timer as unknown as { unref?: () => void }).unref?.();
  adWatcherGraceTimers.set(socketId, timer);
}

function broadcast(io: Server, gameCode: string): void {
  const watchers = adWatchersByGame.get(gameCode);
  const usernames = watchers ? Array.from(new Set(watchers.values())) : [];
  io.to(getGameRoom(gameCode)).emit('lobbyAdWatchingUpdate', { usernames });
}

function setWatching(
  io: Server,
  socketId: string,
  gameCode: string,
  username: string,
  active: boolean,
): void {
  let watchers = adWatchersByGame.get(gameCode);
  if (active) {
    if (!watchers) {
      watchers = new Map();
      adWatchersByGame.set(gameCode, watchers);
    }
    watchers.set(socketId, username);
    gameBySocket.set(socketId, gameCode);
  } else if (watchers) {
    watchers.delete(socketId);
    if (watchers.size === 0) adWatchersByGame.delete(gameCode);
    gameBySocket.delete(socketId);
  } else {
    gameBySocket.delete(socketId);
  }
  broadcast(io, gameCode);
}

function clearOnDisconnect(io: Server, socketId: string): void {
  const gameCode = gameBySocket.get(socketId);
  gameBySocket.delete(socketId);
  if (!gameCode) return;
  const watchers = adWatchersByGame.get(gameCode);
  if (!watchers || !watchers.delete(socketId)) return;
  // The socket died MID-ad — mark it so a host gets the reconnection-grace
  // path instead of an instant transfer. The UI gate clears right away (below),
  // so Start can never wedge on this; the marker is only for the seat.
  armAdWatcherGrace(socketId);
  if (watchers.size === 0) adWatchersByGame.delete(gameCode);
  broadcast(io, gameCode);
}

function registerLobbyAdGateHandlers(io: Server, socket: Socket): void {
  socket.on('lobby:adWatching', (data: { active?: boolean }) => {
    if (isSocketMigrating(socket)) return;
    if (!checkRateLimit(socket.id, AD_GATE_WEIGHT)) {
      inc('rateLimited');
      return;
    }
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);
    if (!gameCode || !username) return;

    // Any state with a live game: 'waiting' (lobby Start gate), 'finished'
    // (the host's between-games interstitial), 'playing' (mid-round rewarded).
    const game = getGame(gameCode);
    if (!game) return;

    setWatching(io, socket.id, gameCode, username, !!data?.active);
  });

  socket.on('disconnect', () => clearOnDisconnect(io, socket.id));
}

export { registerLobbyAdGateHandlers };
