/**
 * Word Tower (versus) Handler
 * Server-authoritative real-time versus: word submits, tray scrambles, and
 * bomb sends. All game logic lives in the pure lib/wordTower/versusMatch brain;
 * this layer is socket plumbing + broadcast only.
 */
import type { Server, Socket } from 'socket.io';
import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  updatePlayerScore,
} from '../modules/gameStateManager.js';
import { broadcastToRoom, volatileBroadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { validatePayload } from '../utils/socketValidation.js';
import {
  SubmitTowerWordSchema,
  ScrambleTowerSchema,
  SendTowerBombSchema,
  type SubmitTowerWordData,
  type SendTowerBombData,
} from '../../shared/schemas/socketSchemas.js';
import logger from '../utils/logger.js';
import { isValidWord } from '../dictionary.js';
import type { Language } from '@/shared/types/game';
import {
  submitVersusWord,
  scrambleVersus,
  sendVersusBomb,
  versusStandings,
} from '@/lib/wordTower/versusMatch';
import { clientTowerView } from '@/lib/wordTower/wordTowerManager';

function broadcastTowerStandings(io: Server, gameCode: string): void {
  const game = getGame(gameCode);
  if (!game?.wordTowerVersusState) return;
  volatileBroadcastToRoom(io, getGameRoom(gameCode), 'towerStandings', {
    standings: versusStandings(game.wordTowerVersusState),
  });
}

/** Resolve the socket to its in-progress word-tower match + identity. */
function resolveMatch(socket: Socket) {
  const gameCode = getGameBySocketId(socket.id);
  const username = getUsernameBySocketId(socket.id);
  if (!gameCode || !username) {
    socket.emit('error', { message: 'Not in a game' });
    return null;
  }
  const game = getGame(gameCode);
  if (!game) { socket.emit('error', { message: 'Game not found' }); return null; }
  if (game.gameState !== 'in-progress') { socket.emit('error', { message: 'Game is not in progress' }); return null; }
  if (game.gameMode !== 'word-tower') { socket.emit('error', { message: 'Not a word-tower game' }); return null; }
  if (!game.wordTowerVersusState) { socket.emit('error', { message: 'Tower match not initialized' }); return null; }
  return { gameCode, username, game, lang: (game.language || 'en') as Language };
}

export function handleSubmitTowerWord(io: Server, socket: Socket, data: SubmitTowerWordData): void {
  const ctx = resolveMatch(socket);
  if (!ctx) return;
  const { gameCode, username, game, lang } = ctx;

  const isInDictionary = (canonWord: string) => isValidWord(canonWord.toLowerCase(), lang) === true;
  const outcome = submitVersusWord(game.wordTowerVersusState!, username, data.word, isInDictionary);
  game.wordTowerVersusState = outcome.state;

  if (!outcome.accepted) {
    socket.emit('towerWordResult', { accepted: false, error: outcome.error });
    return;
  }

  // Mirror height into the generic score so end-game/leaderboard reflect it.
  if (outcome.result) {
    updatePlayerScore(gameCode, username, Math.round(outcome.result.meters), true);

    // Record the word into playerWords so end-game recorder captures it for weekly-quest + XP.
    if (!game.playerWords) game.playerWords = {};
    if (!game.playerWords[username]) game.playerWords[username] = [];
    game.playerWords[username].push(data.word);
  }

  socket.emit('towerWordResult', {
    accepted: true,
    result: outcome.result,
    state: clientTowerView(outcome.state.players[username].game),
  });
  broadcastTowerStandings(io, gameCode);
}

export function handleScrambleTower(io: Server, socket: Socket): void {
  const ctx = resolveMatch(socket);
  if (!ctx) return;
  const { gameCode, username, game } = ctx;
  game.wordTowerVersusState = scrambleVersus(game.wordTowerVersusState!, username);
  socket.emit('towerTrayUpdate', {
    state: clientTowerView(game.wordTowerVersusState.players[username].game),
  });
  broadcastTowerStandings(io, gameCode);
}

export function handleSendTowerBomb(io: Server, socket: Socket, data: SendTowerBombData): void {
  const ctx = resolveMatch(socket);
  if (!ctx) return;
  const { gameCode, username, game } = ctx;

  const outcome = sendVersusBomb(game.wordTowerVersusState!, username, data.targetPlayerId, Date.now());
  game.wordTowerVersusState = outcome.state;

  if (!outcome.sent) {
    socket.emit('towerBombResult', { sent: false, error: outcome.error });
    return;
  }

  socket.emit('towerBombResult', { sent: true, targetId: outcome.targetId, removed: outcome.removed, damage: outcome.damage });
  broadcastToRoom(io, getGameRoom(gameCode), 'towerBombHit', {
    fromId: username,
    targetId: outcome.targetId,
    removed: outcome.removed,
    damage: outcome.damage,
  });
  broadcastTowerStandings(io, gameCode);
  logger.info('WORD_TOWER', `${username} bombed ${outcome.targetId} in ${gameCode} (-${outcome.removed} floors)`);
}

/**
 * Benign state PULL — never emits an 'error'. The versus hook mounts during the
 * pre-game countdown and polls before the per-player match is initialized
 * (initialized in gameStartHandler only after the `startGame` broadcast). When
 * not ready we no-op; the server pushes `towerMatchReady` on init and the client
 * re-pulls. (The action handlers below keep the strict resolveMatch, which DOES
 * error — submitting a word before init is a real misuse, polling is not.)
 */
export function handleRequestTowerState(socket: Socket): void {
  const gameCode = getGameBySocketId(socket.id);
  const username = getUsernameBySocketId(socket.id);
  if (!gameCode || !username) return;
  const game = getGame(gameCode);
  if (!game || game.gameState !== 'in-progress' || game.gameMode !== 'word-tower' || !game.wordTowerVersusState) return;
  const player = game.wordTowerVersusState.players[username];
  if (!player) return;
  socket.emit('towerStateSync', {
    you: clientTowerView(player.game),
    standings: versusStandings(game.wordTowerVersusState),
    endsAtMs: game.wordTowerVersusState.endsAtMs,
  });
}

export function registerWordTowerHandlers(io: Server, socket: Socket): void {
  socket.on('requestTowerState', () => handleRequestTowerState(socket));

  socket.on('submitTowerWord', (data: unknown) => {
    if (!checkRateLimit(socket.id, 5)) {
      socket.emit('rateLimited', { message: 'Too many submissions, slow down' });
      return;
    }
    const v = validatePayload(SubmitTowerWordSchema, data);
    if (!v.success || !v.data) {
      socket.emit('error', { message: `Invalid word: ${v.success ? 'missing data' : v.error}` });
      return;
    }
    try {
      handleSubmitTowerWord(io, socket, v.data);
    } catch (err) {
      logger.error('WORD_TOWER', `Error submitTowerWord: ${(err as Error).message}`);
      socket.emit('error', { message: 'Error processing tower word' });
    }
  });

  socket.on('scrambleTower', (data: unknown) => {
    if (!checkRateLimit(socket.id, 2)) return;
    const v = validatePayload(ScrambleTowerSchema, data ?? {});
    if (!v.success) { socket.emit('error', { message: 'Invalid scramble' }); return; }
    try {
      handleScrambleTower(io, socket);
    } catch (err) {
      logger.error('WORD_TOWER', `Error scrambleTower: ${(err as Error).message}`);
    }
  });

  socket.on('sendTowerBomb', (data: unknown) => {
    if (!checkRateLimit(socket.id, 3)) return;
    const v = validatePayload(SendTowerBombSchema, data);
    if (!v.success || !v.data) { socket.emit('error', { message: 'Invalid bomb target' }); return; }
    try {
      handleSendTowerBomb(io, socket, v.data);
    } catch (err) {
      logger.error('WORD_TOWER', `Error sendTowerBomb: ${(err as Error).message}`);
    }
  });
}
