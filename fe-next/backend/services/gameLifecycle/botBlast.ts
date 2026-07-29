/**
 * Bot Blast Mode
 *
 * Handles bot submissions for Blast MP games. Unlike classic/wheel-rush/word-hunt,
 * Blast bots must solve the CURRENT shared board (which mutates continuously
 * via gravity/cascades after each human and bot word). Bots re-solve periodically
 * rather than once-static.
 *
 * Key differences from classic:
 * - Grid is shared, mutable, and re-synced on mutations
 * - Words go through the same mutation + gravity pipeline as human submissions
 * - Anti-grief cap is enforced via score gate + difficulty-based timing
 */

import type { Server } from 'socket.io';
import type { Language, BlastModeState } from '@/shared/types/game';
import type { Bot } from '../../modules/botBehavior';
import { getGame, updatePlayerScore, addPlayerWord, recordFirstFinder, trackBotWord, getLeaderboard } from '../../modules/gameStateManager';
import {
  calculateBlastTileBonus,
  getTilesOnPath,
  recordBlastMove,
  getWordPath,
  getOrInitPlayerBoard,
  cascadeBlastWord,
} from '../../modules/blastModeManager';
import { regenerateBlastBoardIfExhausted } from '../../modules/blastBoardRegen';
import { processTilesForWord } from '@/components/blast/legacy/utils/clearTilesProcessor';
import { computeGravityResult } from '@/components/blast/legacy/utils/blastGravity';
import { createSeededRandom } from '@/components/blast/legacy/utils/blastLetterGenerator';
import { BLAST_SPECIAL_TILE_CHANCE } from '@/shared/constants/blastMultiplayerConstants';
import { BOARD_WORD_SCORE_PER_LETTER } from '@/shared/constants/wordHuntMultiplayerConstants';
import { broadcastToRoom, volatileBroadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import { findAllWords, getCachedTrie } from '../../modules/boggleSolver';
import { setBotTimeout } from '../../modules/botLifecycle';
import { ensureLanguageLoaded } from '../../dictionary';
import { shouldBotScore } from './botGame';
import { BOT_CONFIG } from '../../modules/botConfig';
import { makePositionsMap } from '../../modules/wordValidator';
import logger from '../../utils/logger';

/**
 * Anti-grief cap: max clears (board-modifying words) per bot per minute.
 * A "clear" is a word that removes tiles; we cap by slowing cadence + score gate.
 * Hard bots can submit 1 clear per 2-3 seconds; easy bots slower.
 * This is SOFT: enforced via timing + shouldBotScore gate, not hard rejection.
 */
const ANTI_GRIEF_CONFIG = {
  maxClearsPerMinute: {
    easy: 15,    // ~1 every 4 seconds
    medium: 25,  // ~1 every 2.4 seconds
    hard: 40,    // ~1 every 1.5 seconds
  },
};

/**
 * Per-bot clear tracking for anti-grief (opaque dict, keyed by bot username).
 * Tracks recent clears + timestamp windows to enforce per-minute caps.
 */
const botClearHistory = new Map<string, { count: number; resetAt: number }>();

function getOrInitClearWindow(botUsername: string): { count: number; resetAt: number } {
  const now = Date.now();
  const existing = botClearHistory.get(botUsername);
  if (existing && existing.resetAt > now) {
    return existing;
  }
  const window = { count: 0, resetAt: now + 60_000 };
  botClearHistory.set(botUsername, window);
  return window;
}

function recordClear(botUsername: string): void {
  const window = getOrInitClearWindow(botUsername);
  window.count += 1;
}

function canBotClear(botUsername: string, difficulty: string): boolean {
  const window = getOrInitClearWindow(botUsername);
  const cap = ANTI_GRIEF_CONFIG.maxClearsPerMinute[difficulty as keyof typeof ANTI_GRIEF_CONFIG.maxClearsPerMinute]
    ?? ANTI_GRIEF_CONFIG.maxClearsPerMinute.medium;
  return window.count < cap;
}

/**
 * Submit one word from a bot on the current blast board.
 * Validates word exists on CURRENT grid, applies mutation + gravity,
 * broadcasts updates, enforces score cap.
 */
export function submitBlastWord(
  io: Server,
  gameCode: string,
  bot: Bot,
  state: BlastModeState,
  word: string,
  currentGrid: string[][],
  language: Language,
): void {
  if (!bot.isActive) return;

  const game = getGame(gameCode);
  if (!game) return;

  try {
    // Validate word on CURRENT grid (not stale)
    const positions = game.letterPositions || makePositionsMap(currentGrid, language);

    // Check if word can be formed on the current board
    const trie = getCachedTrie(language);
    if (!trie) {
      logger.warn('BOT_BLAST', `No trie for ${language}, skipping word "${word}"`);
      return;
    }

    // Simple existence check: word should be findable with current grid
    const allWords = findAllWords(currentGrid, language, {
      minLength: 3,
      maxLength: 8,
      maxWords: 5000,
      trie,
    });

    if (!allWords.includes(word.toLowerCase())) {
      logger.debug('BOT_BLAST', `[${bot.username}] word "${word}" not on current grid, skipping`);
      return;
    }

    // Bot plays on its OWN independent board (per-player), so bot clears never
    // sync onto human players' boards.
    const board = getOrInitPlayerBoard(state, bot.username);
    if (!board.grid || !board.tileStates) {
      logger.warn('BOT_BLAST', `Invalid blast board for ${gameCode}`);
      return;
    }
    const boardPositions = makePositionsMap(board.grid, language);

    // Calculate blast tile bonus against the bot's board
    const tilesOnPath = getTilesOnPath(word, boardPositions, board.overlay, board.overlayMap);
    const blastTileBonus = calculateBlastTileBonus(tilesOnPath);
    const gemCount = tilesOnPath.filter((t: string) => t === 'gem').length;

    const totalScore = word.length - 1 + blastTileBonus;

    // Score cap: prevent bots from dominating
    if (!shouldBotScore(gameCode, bot.username, bot.score, totalScore, bot.difficulty)) {
      logger.info('BOT_BLAST', `Bot "${bot.username}" score capped (target reached)`);
      return;
    }

    // Anti-grief: if this word will clear tiles, check cap
    const wordPath = getWordPath(word, boardPositions);
    if (wordPath.length > 0 && !canBotClear(bot.username, bot.difficulty)) {
      logger.debug('BOT_BLAST', `Bot "${bot.username}" clear cap hit, skipping "${word}"`);
      return;
    }

    // Record move + apply board mutation on the bot's OWN board. NO broadcast —
    // a bot's board is private (no client renders it).
    recordBlastMove(state, bot.username, (bot.comboLevel || 0), word, tilesOnPath.length, gemCount, blastTileBonus);

    const processClearedCount = cascadeBlastWord(board, wordPath, word, state.wave ?? 1, language).clearedCount;

    // Per-player board refresh (silent: no socket → bots don't emit).
    regenerateBlastBoardIfExhausted({
      io,
      gameCode,
      game,
      username: bot.username,
      board,
      newTileStates: board.tileStates,
    });

    // Record clear for anti-grief
    if (processClearedCount > 0) {
      recordClear(bot.username);
    }

    // Update score + combo
    if (!game.playerCombos) game.playerCombos = {};
    game.playerCombos[bot.username] = (bot.comboLevel || 0) + 1;

    addPlayerWord(gameCode, bot.username, word, {
      autoValidated: true,
      score: totalScore,
      comboBonus: 0,
      comboLevel: bot.comboLevel || 0,
      isBot: true,
    });

    const isFirstFinder = recordFirstFinder(gameCode, word, bot.username, bot.avatar);

    trackBotWord(gameCode, word, bot.username, totalScore);
    updatePlayerScore(gameCode, bot.username, totalScore, true);
    bot.score += totalScore;

    // Broadcast bot activity
    volatileBroadcastToRoom(io, getGameRoom(gameCode), 'botWordFound', {
      username: bot.username,
      word,
      score: totalScore,
      isFirstFinder,
    });

    volatileBroadcastToRoom(io, getGameRoom(gameCode), 'playerFoundWord', {
      username: bot.username,
      word,
      wordCount: (game.playerWords?.[bot.username]?.length || 0),
      score: bot.score,
      comboLevel: bot.comboLevel || 0,
      isFirstFinder,
    });

    const leaderboard = getLeaderboard(gameCode);
    volatileBroadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });

    logger.info('BOT_BLAST', `Bot "${bot.username}" submitted "${word}" (+${totalScore}) in ${gameCode}`);
    // Board refresh handled by regenerateBlastBoardIfExhausted above (shared path).
  } catch (err) {
    logger.error('BOT_BLAST', `Bot "${bot.username}" submission failed: ${(err as Error).message}`);
  }
}

/**
 * Schedule one bot's submissions for a blast game.
 * Periodically re-solves the current grid (every 2-3 seconds per bot).
 */
function scheduleBlastBot(
  io: Server,
  gameCode: string,
  bot: Bot,
  state: BlastModeState,
  language: Language,
  gameEndTime: number,
): void {
  if (!bot.isActive || !state.grid) return;

  const timing = BOT_CONFIG.TIMING[bot.difficulty] || BOT_CONFIG.TIMING.medium;
  const firstDelay = timing.startDelay + Math.random() * 1500;

  const tick = (attempt: number): void => {
    if (!bot.isActive) return;

    const remaining = gameEndTime - Date.now();
    if (remaining <= 500) return;

    // Re-solve CURRENT grid every tick (not static once-at-start)
    const game = getGame(gameCode);
    if (!game?.letterGrid || !game.letterGrid.length) {
      logger.debug('BOT_BLAST', `Bot "${bot.username}" has no grid, halting`);
      return;
    }

    const trie = getCachedTrie(language);
    if (!trie) return;

    const allWords = findAllWords(game.letterGrid, language, {
      minLength: 3,
      maxLength: 8,
      maxWords: 5000,
      trie,
    });

    if (allWords.length === 0) {
      logger.debug('BOT_BLAST', `Bot "${bot.username}" found no words on current grid`);
      // Schedule next tick anyway
      const delay = timing.minDelay + Math.random() * (timing.maxDelay - timing.minDelay);
      if (delay < remaining - 500) {
        setBotTimeout(bot, () => tick(attempt + 1), delay);
      }
      return;
    }

    // Pick a random word from current board
    const word = allWords[Math.floor(Math.random() * allWords.length)];
    submitBlastWord(io, gameCode, bot, state, word, game.letterGrid, language);

    // Schedule next submission
    const delay = timing.minDelay + Math.random() * (timing.maxDelay - timing.minDelay);
    if (delay < remaining - 500) {
      setBotTimeout(bot, () => tick(attempt + 1), delay);
    }
  };

  setBotTimeout(bot, () => tick(0), firstDelay);
}

/**
 * Start bots for a Blast game. Solves the CURRENT shared board,
 * not a static grid captured once.
 */
export async function startBotsForBlast(
  io: Server,
  gameCode: string,
  bots: Bot[],
  blastState: BlastModeState,
  language: Language,
  timerSeconds: number,
): Promise<void> {
  if (!bots || bots.length === 0) return;

  if (!blastState.grid || !Array.isArray(blastState.grid) || blastState.grid.length === 0) {
    logger.error('BOT_BLAST', `Cannot start bots for ${gameCode}: invalid blast grid`);
    return;
  }

  // Recovery paths (server restart/reconnect → resumeGameTimerIfMissing) relaunch bots
  // without the gameStartHandler dictionary pre-load. A cold trie here → bail below →
  // no blast bots → frozen leaderboard. Warm the dict first, like the classic driver.
  await ensureLanguageLoaded(language);

  const trie = getCachedTrie(language);
  if (!trie) {
    logger.warn('BOT_BLAST', `No trie for ${language}, skipping blast bots`);
    return;
  }

  const gameEndTime = Date.now() + timerSeconds * 1000;

  logger.info('BOT_BLAST', `Starting ${bots.length} bots for blast game ${gameCode} (${language})`);

  for (const bot of bots) {
    bot.isActive = true;
    scheduleBlastBot(io, gameCode, bot, blastState, language, gameEndTime);
    logger.info('BOT_BLAST', `Bot "${bot.username}" queued for ${gameCode}`);
  }
}
