/**
 * Lobby Ad-Gate Handler
 *
 * Relays "this player is watching a rewarded ad while in the lobby" presence to
 * the rest of the room. The host's Start button disables while anyone is mid-ad
 * — starting the game then would tear a watcher out of their ad and void the
 * granted reward (coins / avatar part).
 *
 * Transient relay (no GameState persistence, like lobbyEmoteHandler), lobby-only
 * (gameState === 'waiting'). Watchers are keyed by socket id so a disconnect
 * mid-ad clears the flag and rebroadcasts — Start can never wedge on a dropped
 * watcher. The client always emits active=false on every ad-end path too.
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

// gameCode -> (socketId -> username). Socket-keyed so disconnect cleanup is O(1)
// and a refresh/new socket for the same user can't leave a stale entry.
const adWatchersByGame = new Map<string, Map<string, string>>();
// socketId -> gameCode, so disconnect can find the room without the (possibly
// already-cleared) socket→game mapping in gameStateManager.
const gameBySocket = new Map<string, string>();

/** Test-only: reset module state between cases. */
export function __resetLobbyAdGateState(): void {
  adWatchersByGame.clear();
  gameBySocket.clear();
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

    // Lobby-only — the gate exists to protect the host's pre-game Start.
    const game = getGame(gameCode);
    if (!game || game.gameState !== 'waiting') return;

    setWatching(io, socket.id, gameCode, username, !!data?.active);
  });

  socket.on('disconnect', () => clearOnDisconnect(io, socket.id));
}

export { registerLobbyAdGateHandlers };
