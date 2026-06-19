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
import type { GameState } from '../modules/gameState/types.js';
import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  transitionGameState,
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
import { clearGameTimer } from '../utils/timerManager.js';
import { isSupabaseConfigured } from '../modules/supabaseServer.js';
import { recordGameResultsToSupabase } from '../services/gameLifecycle/gameResults.js';
import logger from '../utils/logger.js';

interface TrieNodeLike { isWord?: boolean }

/** Shiritori is a JA-only mode; validate against the hiragana trie. */
function isJapaneseWord(word: string): boolean {
  const trie = getCachedTrie('ja');
  if (!trie) return false;
  const node = getTrieNode(trie, word);
  return !!(node && (node as TrieNodeLike).isWord === true);
}

/**
 * Finalize a shiritori game: transition state, stop timers, and record results.
 * Called after shiritoriGameOver is broadcast.
 *
 * - Ensures idempotency: returns early if game already ended (first caller wins)
 * - Builds scoresArray from shiritoriState.players (all participants)
 * - Records via recordGameResultsToSupabase
 * - Swallows recorder failures (fire-and-forget async)
 */
async function finalizeShiritoriGame(
  io: Server,
  gameCode: string,
  game: GameState,
  winner: string | null
): Promise<void> {
  // Transition game state FIRST — guards against concurrent finalizations.
  // Only the first caller proceeds; others return early.
  const transitionResult = transitionGameState(gameCode, 'END', { immediate: true });
  if (!transitionResult.success) {
    logger.debug('SHIRITORI', `Game ${gameCode} already finalized, skipping: ${transitionResult.error}`);
    return;
  }

  // Clear the game timer so it can't fire endGame later
  clearGameTimer(gameCode);

  if (!isSupabaseConfigured()) {
    logger.debug('SHIRITORI', `Supabase not configured, skipping results recording for ${gameCode}`);
    return;
  }

  try {
    const state = game.shiritoriState;
    if (!state) {
      logger.warn('SHIRITORI', `finalizeShiritoriGame called but shiritoriState is null for ${gameCode}`);
      return;
    }

    // Build scoresArray: one entry per shiritori participant
    const scoresArray = state.players.map((username: string) => ({
      username,
      totalScore: game.playerScores?.[username] ?? 0,
      wordDetails: (game.playerWords?.[username] ?? []).map((word: string) => ({
        word,
        score: word.length,
        isValid: true,
        isDuplicate: false,
      })),
      achievements: username === winner ? [{ key: 'shiritori_win', icon: '🏆' }] : [],
    }));

    await recordGameResultsToSupabase(io, gameCode, scoresArray as any, game);
    logger.info('SHIRITORI', `Recorded results for ${gameCode} with ${scoresArray.length} players`);
  } catch (err) {
    // Swallow errors: this is fire-and-forget from the handler
    logger.error('SHIRITORI', `Failed to record shiritori results for ${gameCode}: ${(err as Error).message}`);
  }
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

    // Populate playerWords and playerScores BEFORE elimination
    if (!game.playerWords) game.playerWords = {};
    if (!game.playerScores) game.playerScores = {};
    if (!game.playerWords[username]) game.playerWords[username] = [];

    game.playerWords[username].push(word);
    game.playerScores[username] = (game.playerScores[username] ?? 0) + word.length;

    const recorded = { ...state, chain: [...state.chain, word], used: [...state.used, word], requiredHead: null };
    const ended = eliminate(recorded, username, now);
    game.shiritoriState = ended;
    broadcastToRoom(io, room, 'shiritoriWordAccepted', { word, by: username, requiredHead: null, endsInN: true });
    if (ended.finished) {
      broadcastToRoom(io, room, 'shiritoriGameOver', { winner: ended.winner, reason: 'ends-in-n', loser: username });
      // Fire-and-forget: finalize the game (record results, transition state, clear timers)
      void finalizeShiritoriGame(io, gameCode, game, ended.winner).catch((err) => {
        logger.error('SHIRITORI', `finalizeShiritoriGame failed: ${(err as Error).message}`);
      });
    } else {
      broadcastToRoom(io, room, 'shiritoriPlayerEliminated', { player: username, reason: 'ends-in-n', nextPlayer: currentPlayer(ended) });
    }
    return;
  }

  // Normal word submission (doesn't end in ん)
  if (!game.playerWords) game.playerWords = {};
  if (!game.playerScores) game.playerScores = {};
  if (!game.playerWords[username]) game.playerWords[username] = [];

  game.playerWords[username].push(word);
  game.playerScores[username] = (game.playerScores[username] ?? 0) + word.length;

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
    // Fire-and-forget: finalize the game (record results, transition state, clear timers)
    void finalizeShiritoriGame(io, gameCode, game, ended.winner).catch((err) => {
      logger.error('SHIRITORI', `finalizeShiritoriGame failed: ${(err as Error).message}`);
    });
  } else {
    broadcastToRoom(io, room, 'shiritoriPlayerEliminated', { player: loser, reason: 'timeout', nextPlayer: currentPlayer(ended) });
  }
}

/**
 * Push a snapshot of the current shiritori state to a single socket. The MP view
 * mounts only after `startGame`, so it polls this on mount (and on reconnect) to
 * learn the roster, whose turn it is, the required head, and the chain so far —
 * mirrors wheelRushHandler.handleRequestWheelRushState. No-op off shiritori.
 */
export function handleRequestShiritoriState(socket: Socket): void {
  const gameCode = getGameBySocketId(socket.id);
  if (!gameCode) return;
  const game = getGame(gameCode);
  if (!game || game.gameMode !== 'shiritori' || !game.shiritoriState) return;
  const state = game.shiritoriState;
  socket.emit('shiritoriInit', {
    players: state.players,
    currentPlayer: currentPlayer(state),
    requiredHead: state.requiredHead,
    chain: state.chain,
    eliminated: Object.keys(state.eliminated).filter((p) => state.eliminated[p]),
    startedAt: state.startedAt,
    finished: state.finished,
    winner: state.winner,
  });
}

export function registerShiritoriHandlers(io: Server, socket: Socket): void {
  socket.on('requestShiritoriState', () => {
    try {
      handleRequestShiritoriState(socket);
    } catch (err) {
      logger.error('SHIRITORI', `Error requestShiritoriState: ${(err as Error).message}`);
    }
  });

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
