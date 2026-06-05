/**
 * Lobby Emote Handler
 *
 * Relays a player's chosen face emote (angry/silly/wink…) to the rest of their
 * game room while they wait for the host to start. Pure relay — no server state:
 * emotes are ~2s transient, so persisting them would only create stale-emote-on-
 * reconnect bugs. The client renders the avatar face-swap + emoji bubble.
 *
 * Sibling of reactionHandler (in-game emoji reactions); this one is lobby-scoped
 * (gameState === 'waiting') and drives avatar expressions, not floating emoji.
 */
import type { Server, Socket } from 'socket.io';
import {
  getGameBySocketId,
  getUsernameBySocketId,
  getGame,
} from '../modules/gameStateManager';
import { getGameRoom } from '../utils/socketHelpers';
import { checkRateLimit } from '../utils/rateLimiter';
import { checkSocketRateLimit } from '../middleware/rateLimiterRedis';
import { inc } from '../utils/metrics';
import logger from '../utils/logger';
import { isSocketMigrating } from './shared';
import { isLobbyEmoteId } from '@/lib/lobby/lobbyEmotes';

// Emotes have their OWN per-action bucket (2/s) — a player can use the floating
// LobbyReactions toy and the emote tray (both mounted in the lobby) without one
// starving the other's budget.
const EMOTE_WEIGHT = 1;

interface LobbyEmotePayload {
  emote: unknown;
}

function registerLobbyEmoteHandlers(_io: Server, socket: Socket): void {
  socket.on('lobbyEmote', async (data: LobbyEmotePayload) => {
    if (isSocketMigrating(socket)) return;

    if (!checkRateLimit(socket.id, EMOTE_WEIGHT)) {
      inc('rateLimited');
      return;
    }

    // Per-action limit — dedicated lobbyEmote bucket (2/s).
    const rl = await checkSocketRateLimit(socket.id, 'lobbyEmote');
    if (!rl.allowed) {
      logger.warn('RATE_LIMIT', 'Rate limited', {
        socketId: socket.id,
        action: 'lobbyEmote',
      });
      socket.emit('rate-limited', {
        action: 'lobbyEmote',
        retryAfterMs: rl.retryAfterMs,
      });
      return;
    }

    // Validation IS the emote-id guard — drops game moods + junk silently.
    const emote = data?.emote;
    if (!isLobbyEmoteId(emote)) return;

    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);
    if (!gameCode || !username) return;

    // Lobby-only: in-game expression is the quickReaction system's job.
    const game = getGame(gameCode);
    if (!game || game.gameState !== 'waiting') return;

    // Broadcast to OTHERS — the sender shows their own emote optimistically.
    socket
      .to(getGameRoom(gameCode))
      .emit('lobbyEmoteUpdate', { username, emote });
  });
}

export { registerLobbyEmoteHandlers };
