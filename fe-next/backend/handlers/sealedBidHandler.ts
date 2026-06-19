/**
 * Sealed Bid (auction) Handler — simultaneous secret bids resolved across players.
 *
 * Server-authoritative: validates each bid (dictionary + formable-from-rack +
 * min length), locks it, and when every active player has locked (or the round
 * deadline fires) resolves the round ACROSS players (sealedBidManager →
 * sbMpEngine): unique bids double, clashes halve. Broadcasts the reveal, waits a
 * short window, then advances. Mirrors wheelRushHandler/shiritoriHandler shape.
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
  currentRack,
  lockBid,
  allActiveLocked,
  resolveRound,
  advanceRound,
  SEALED_BID_ROUND_MS,
} from '../modules/sealedBidManager.js';
import { canFormFromRack, MIN_WORD_LEN } from '@/lib/sealedBid/sp/sbEngine';
import { getCachedTrie, getTrieNode } from '../modules/boggleSolver.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { validatePayload } from '../utils/socketValidation.js';
import { SubmitSealedBidSchema, type SubmitSealedBidData } from '../../shared/schemas/socketSchemas.js';
import { clearGameTimer } from '../utils/timerManager.js';
import { isSupabaseConfigured } from '../modules/supabaseServer.js';
import { recordGameResultsToSupabase } from '../services/gameLifecycle/gameResults.js';
import logger from '../utils/logger.js';

/** Window (ms) the reveal stays up before advancing to the next round. */
const SEALED_BID_REVEAL_MS = 5000;

interface TrieNodeLike { isWord?: boolean }

/** Per-game timers (round-deadline + reveal→advance). Cleared on game end. */
const sealedBidTimers = new Map<string, NodeJS.Timeout>();

function clearSealedBidTimer(gameCode: string): void {
  const t = sealedBidTimers.get(gameCode);
  if (t) { clearTimeout(t); sealedBidTimers.delete(gameCode); }
}

/** Hebrew final (sofit) letters → base form, so bids match the base-form racks/dict. */
const HEBREW_SOFIT: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
function normalizeBid(word: string): string {
  return word.trim().toUpperCase().split('').map((c) => HEBREW_SOFIT[c] ?? c).join('');
}

function isDictWord(word: string, lang: string): boolean {
  const trie = getCachedTrie(lang);
  if (!trie) return false;
  const node = getTrieNode(trie, word);
  return !!(node && (node as TrieNodeLike).isWord === true);
}

/** Validate a raw bid against the current rack + dictionary. Empty = pass. */
function validateBid(raw: string, rack: string, lang: string): { word: string | null; valid: boolean } {
  const word = normalizeBid(raw);
  if (!word) return { word: null, valid: false };
  const valid = word.length >= MIN_WORD_LEN && canFormFromRack(word, rack) && isDictWord(word, lang);
  return { word, valid };
}

/** The players who can still lock a bid (present in the match roster). */
function activePlayers(game: GameState): string[] {
  return game.sealedBidState?.players ?? [];
}

function buildInitPayload(state: NonNullable<GameState['sealedBidState']>) {
  return {
    players: state.players,
    racks: state.racks,
    index: state.index,
    rack: state.racks[state.index] ?? null,
    phase: state.phase,
    scores: state.scores,
    roundDeadline: state.roundDeadline,
    totalRounds: state.racks.length,
    // Whether THIS round already has a locked bid is per-socket; client tracks locally.
  };
}

/** Resolve the current round, broadcast the reveal, and schedule the advance. */
function resolveAndBroadcast(io: Server, gameCode: string): void {
  clearSealedBidTimer(gameCode);
  const game = getGame(gameCode);
  if (!game || game.gameMode !== 'sealed-bid' || !game.sealedBidState) return;
  if (game.sealedBidState.phase !== 'bidding') return;

  const { state, results } = resolveRound(game.sealedBidState);
  game.sealedBidState = state;
  // Mirror per-player words/scores onto the game for the standard results pipeline.
  if (!game.playerScores) game.playerScores = {};
  if (!game.playerWords) game.playerWords = {};
  for (const r of results) {
    game.playerScores[r.username] = state.scores[r.username] ?? 0;
    if (r.word) {
      if (!game.playerWords[r.username]) game.playerWords[r.username] = [];
      game.playerWords[r.username].push(r.word);
    }
  }

  const room = getGameRoom(gameCode);
  broadcastToRoom(io, room, 'sealedBidRoundResult', {
    index: state.index,
    rack: state.racks[state.index] ?? null,
    results,
    scores: state.scores,
  });

  const isLast = state.index + 1 >= state.racks.length;
  const timer = setTimeout(() => advanceAndBroadcast(io, gameCode), SEALED_BID_REVEAL_MS);
  sealedBidTimers.set(gameCode, timer);
  if (isLast) {
    logger.debug('SEALED_BID', `Game ${gameCode}: final round revealed, finishing after reveal window`);
  }
}

/** Advance to the next bidding round, or finish the match. */
function advanceAndBroadcast(io: Server, gameCode: string): void {
  clearSealedBidTimer(gameCode);
  const game = getGame(gameCode);
  if (!game || game.gameMode !== 'sealed-bid' || !game.sealedBidState) return;

  const now = Date.now();
  const advanced = advanceRound(game.sealedBidState, now, SEALED_BID_ROUND_MS);
  game.sealedBidState = advanced;
  const room = getGameRoom(gameCode);

  if (advanced.phase === 'done') {
    const winner = topScorer(advanced.scores);
    broadcastToRoom(io, room, 'sealedBidGameOver', { scores: advanced.scores, winner });
    void finalizeSealedBidGame(io, gameCode, game, winner).catch((err) => {
      logger.error('SEALED_BID', `finalizeSealedBidGame failed: ${(err as Error).message}`);
    });
    return;
  }

  broadcastToRoom(io, room, 'sealedBidNextRound', {
    index: advanced.index,
    rack: advanced.racks[advanced.index] ?? null,
    roundDeadline: advanced.roundDeadline,
    scores: advanced.scores,
  });
  // Arm the next round's deadline.
  const timer = setTimeout(() => resolveAndBroadcast(io, gameCode), SEALED_BID_ROUND_MS);
  sealedBidTimers.set(gameCode, timer);
}

function topScorer(scores: Record<string, number>): string | null {
  let best: string | null = null;
  let bestScore = -1;
  for (const [u, s] of Object.entries(scores)) {
    if (s > bestScore) { bestScore = s; best = u; }
  }
  return best;
}

/**
 * Finalize: transition state (idempotent), clear timers, record results. Mirrors
 * finalizeShiritoriGame.
 */
async function finalizeSealedBidGame(io: Server, gameCode: string, game: GameState, winner: string | null): Promise<void> {
  const transitionResult = transitionGameState(gameCode, 'END', { immediate: true });
  if (!transitionResult.success) return;
  clearGameTimer(gameCode);
  clearSealedBidTimer(gameCode);
  if (!isSupabaseConfigured()) return;
  try {
    const state = game.sealedBidState;
    if (!state) return;
    const scoresArray = state.players.map((username) => ({
      username,
      totalScore: state.scores[username] ?? 0,
      wordDetails: (game.playerWords?.[username] ?? []).map((word) => ({
        word, score: word.length, isValid: true, isDuplicate: false,
      })),
      achievements: username === winner ? [{ key: 'sealed_bid_win', icon: '🏆' }] : [],
    }));
    await recordGameResultsToSupabase(io, gameCode, scoresArray as never, game);
  } catch (err) {
    logger.error('SEALED_BID', `Failed to record sealed-bid results for ${gameCode}: ${(err as Error).message}`);
  }
}

export function handleSubmitSealedBid(io: Server, socket: Socket, data: SubmitSealedBidData): void {
  const gameCode = getGameBySocketId(socket.id);
  const username = getUsernameBySocketId(socket.id);
  if (!gameCode || !username) { socket.emit('error', { message: 'Not in a game' }); return; }
  const game = getGame(gameCode);
  if (!game) { socket.emit('error', { message: 'Game not found' }); return; }
  if (game.gameMode !== 'sealed-bid') { socket.emit('error', { message: 'Not a sealed-bid game' }); return; }
  const state = game.sealedBidState;
  if (!state) { socket.emit('error', { message: 'Sealed Bid state not initialized' }); return; }
  if (state.phase !== 'bidding') { socket.emit('sealedBidRejected', { error: 'not-bidding' }); return; }
  if (state.bids[username]?.locked) { socket.emit('sealedBidRejected', { error: 'already-locked' }); return; }

  const rack = currentRack(state) ?? '';
  const lang = game.language || 'en';
  const { word, valid } = validateBid(data.word, rack, lang);
  game.sealedBidState = lockBid(state, username, word, valid);

  // Confirm the lock to the bidder (with its validity) — opponents only see the
  // reveal, not who bid what, until resolution.
  socket.emit('sealedBidLocked', { word, valid });
  // Tell the room how many have locked (progress, no word leak).
  const lockedCount = activePlayers(game).filter((p) => game.sealedBidState?.bids[p]?.locked).length;
  broadcastToRoom(io, getGameRoom(gameCode), 'sealedBidLockProgress', {
    locked: lockedCount,
    total: activePlayers(game).length,
  });

  if (allActiveLocked(game.sealedBidState, activePlayers(game))) {
    resolveAndBroadcast(io, gameCode);
  }
}

/** Push a snapshot to a single socket (mount / reconnect). */
export function handleRequestSealedBidState(socket: Socket): void {
  const gameCode = getGameBySocketId(socket.id);
  if (!gameCode) return;
  const game = getGame(gameCode);
  if (!game || game.gameMode !== 'sealed-bid' || !game.sealedBidState) return;
  socket.emit('sealedBidInit', buildInitPayload(game.sealedBidState));
}

/** Arm the first round's deadline timer. Called from gameStartHandler after broadcast. */
export function armSealedBidFirstRound(io: Server, gameCode: string): void {
  clearSealedBidTimer(gameCode);
  const timer = setTimeout(() => resolveAndBroadcast(io, gameCode), SEALED_BID_ROUND_MS);
  sealedBidTimers.set(gameCode, timer);
}

export function registerSealedBidHandlers(io: Server, socket: Socket): void {
  socket.on('requestSealedBidState', () => {
    try { handleRequestSealedBidState(socket); }
    catch (err) { logger.error('SEALED_BID', `Error requestSealedBidState: ${(err as Error).message}`); }
  });

  socket.on('submitSealedBid', (data: unknown) => {
    if (!checkRateLimit(socket.id, 5)) {
      socket.emit('rateLimited', { message: 'Too many bids, slow down' });
      return;
    }
    const result = validatePayload(SubmitSealedBidSchema, data);
    if (!result.success || !result.data) {
      socket.emit('error', { message: `Invalid bid: ${result.success ? 'missing data' : result.error}` });
      return;
    }
    try {
      handleSubmitSealedBid(io, socket, result.data);
    } catch (err) {
      logger.error('SEALED_BID', `Error submitSealedBid: ${(err as Error).message}`);
      socket.emit('error', { message: 'Error processing sealed bid' });
    }
  });
}
