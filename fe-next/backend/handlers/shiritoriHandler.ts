/**
 * Shiritori (しりとり) Handler — turn-based word-chain submissions.
 *
 * Server-authoritative: validates the submitted word against the chain rule
 * (shiritoriManager) + the JA hiragana dictionary (trie), advances the turn, and
 * broadcasts. A word ending in ん is accepted into history but eliminates the
 * submitter (no successor). Mirrors wheelRushHandler's shape.
 * Spec: docs/2026-05-21-shiritori-mode-spec.md.
 */
import type { Server, Socket } from 'socket.io';
import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
} from '../modules/gameStateManager.js';
import {
  validateShiritoriWord,
  applyShiritoriWord,
  eliminate,
  currentPlayer,
} from '../modules/shiritoriManager.js';
import { getCachedTrie, getTrieNode } from '../modules/boggleSolver.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { validatePayload } from '../utils/socketValidation.js';
import { SubmitShiritoriWordSchema, type SubmitShiritoriWordData } from '../../shared/schemas/socketSchemas.js';
import logger from '../utils/logger.js';

interface TrieNodeLike { isWord?: boolean }

/** Shiritori is a JA-only mode; validate against the hiragana trie. */
function isJapaneseWord(word: string): boolean {
  const trie = getCachedTrie('ja');
  if (!trie) return false;
  const node = getTrieNode(trie, word);
  return !!(node && (node as TrieNodeLike).isWord === true);
}

export function handleSubmitShiritoriWord(io: Server, socket: Socket, data: SubmitShiritoriWordData): void {
  const gameCode = getGameBySocketId(socket.id);
  const username = getUsernameBySocketId(socket.id);
  if (!gameCode || !username) { socket.emit('error', { message: 'Not in a game' }); return; }

  const game = getGame(gameCode);
  if (!game) { socket.emit('error', { message: 'Game not found' }); return; }
  if (game.gameMode !== 'shiritori') { socket.emit('error', { message: 'Not a shiritori game' }); return; }

  const state = game.shiritoriState;
  if (!state) { socket.emit('error', { message: 'Shiritori state not initialized' }); return; }
  if (state.finished) { socket.emit('error', { message: 'Game already finished' }); return; }
  if (currentPlayer(state) !== username) {
    socket.emit('shiritoriWordRejected', { word: data.word, error: 'not-your-turn' });
    return;
  }

  const word = (data.word || '').trim();
  const validation = validateShiritoriWord(state, word, isJapaneseWord);
  if (!validation.valid) {
    socket.emit('shiritoriWordRejected', { word, error: validation.error });
    return;
  }

  const now = Date.now();
  const room = getGameRoom(gameCode);

  if (validation.endsGame) {
    // Valid word, but ends in ん → record it for history, then the submitter loses.
    // Reset requiredHead so survivors start a fresh link (ん has no successor).
    const recorded = { ...state, chain: [...state.chain, word], used: [...state.used, word], requiredHead: null };
    const ended = eliminate(recorded, username, now);
    game.shiritoriState = ended;
    broadcastToRoom(io, room, 'shiritoriWordAccepted', { word, by: username, requiredHead: null, endsInN: true });
    if (ended.finished) {
      broadcastToRoom(io, room, 'shiritoriGameOver', { winner: ended.winner, reason: 'ends-in-n', loser: username });
    } else {
      broadcastToRoom(io, room, 'shiritoriPlayerEliminated', { player: username, reason: 'ends-in-n', nextPlayer: currentPlayer(ended) });
    }
    return;
  }

  const applied = applyShiritoriWord(state, word, now);
  game.shiritoriState = applied;
  broadcastToRoom(io, room, 'shiritoriWordAccepted', {
    word,
    by: username,
    requiredHead: applied.requiredHead,
    nextPlayer: currentPlayer(applied),
    chainLength: applied.chain.length,
  });
}

/**
 * Eliminate the current player for letting their turn timer expire (driven by the
 * room's turn timer or a client timeout signal). Exported for the timer wiring +
 * tests.
 */
export function handleShiritoriTimeout(io: Server, gameCode: string): void {
  const game = getGame(gameCode);
  if (!game || game.gameMode !== 'shiritori' || !game.shiritoriState || game.shiritoriState.finished) return;
  const loser = currentPlayer(game.shiritoriState);
  if (!loser) return;
  const ended = eliminate(game.shiritoriState, loser);
  game.shiritoriState = ended;
  const room = getGameRoom(gameCode);
  if (ended.finished) {
    broadcastToRoom(io, room, 'shiritoriGameOver', { winner: ended.winner, reason: 'timeout', loser });
  } else {
    broadcastToRoom(io, room, 'shiritoriPlayerEliminated', { player: loser, reason: 'timeout', nextPlayer: currentPlayer(ended) });
  }
}

export function registerShiritoriHandlers(io: Server, socket: Socket): void {
  socket.on('submitShiritoriWord', (data: unknown) => {
    if (!checkRateLimit(socket.id, 5)) {
      socket.emit('rateLimited', { message: 'Too many submissions, slow down' });
      return;
    }
    const result = validatePayload(SubmitShiritoriWordSchema, data);
    if (!result.success || !result.data) {
      socket.emit('error', { message: `Invalid word: ${result.success ? 'missing data' : result.error}` });
      return;
    }
    try {
      handleSubmitShiritoriWord(io, socket, result.data);
    } catch (err) {
      logger.error('SHIRITORI', `Error submitShiritoriWord: ${(err as Error).message}`);
      socket.emit('error', { message: 'Error processing shiritori word' });
    }
  });
}
