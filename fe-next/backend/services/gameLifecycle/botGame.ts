/**
 * Bot Game Service
 *
 * Handles bot initialization and submission handling for multiplayer games.
 * Includes score capping to ensure bots never outscore the best human player.
 */

import type { Server } from 'socket.io';
import type { LetterGrid, Language } from '@/shared/types';
import {
  addPlayerWord,
  updatePlayerScore,
  trackBotWord,
  getLeaderboard,
  getLeaderboardThrottled,
  getGame,
  recordFirstFinder,
} from '../../modules/gameStateManager';
import { broadcastToRoom, volatileBroadcastToRoom, getGameRoom } from '../../utils/socketHelpers';

/**
 * Broadcast the leaderboard after a bot word — THROTTLED.
 *
 * Each bot word previously emitted a full, unthrottled `updateLeaderboard`
 * (the heaviest MP payload). With 3 bots scoring several words/sec this floods
 * the room and the residual volume is what the client must JSON-parse +
 * dispatch ("MP classic feels stuck on the frontend"). Humans never emit a
 * per-word leaderboard. Routing through the SHARED per-gameCode throttled
 * broadcaster caps total leaderboard broadcasts (humans + bots) at ~2/sec while
 * preserving leading + trailing edges, so the leaderboard never goes stale.
 */
export function emitBotLeaderboard(io: Server, gameCode: string): void {
  getLeaderboardThrottled(gameCode, (leaderboard) => {
    volatileBroadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
  });
}
import {
  calculateBlastTileBonus,
  getTilesOnPath,
  recordBlastMove,
  getWordPath,
  getOrInitPlayerBoard,
  cascadeBlastWord,
} from '../../modules/blastModeManager';
import { makePositionsMap } from '../../modules/wordValidator';
import { regenerateBlastBoardIfExhausted } from '../../modules/blastBoardRegen';
import { processTilesForWord } from '@/components/blast/legacy/utils/clearTilesProcessor';
import { computeGravityResult } from '@/components/blast/legacy/utils/blastGravity';
import { createSeededRandom } from '@/components/blast/legacy/utils/blastLetterGenerator';
import {
  BLAST_SPECIAL_TILE_CHANCE,
} from '@/shared/constants/blastMultiplayerConstants';
import { BOARD_WORD_SCORE_PER_LETTER } from '@/shared/constants/wordHuntMultiplayerConstants';
import * as botManager from '../../modules/botManager';
import logger from '../../utils/logger';
import type { BotSubmission } from './types';
import type { Bot } from '../../modules/botBehavior';
import { startBotsForWordHunt } from './botWordHunt';
import { startBotsForWheelRush } from './botWheelRush';
import { startBotsForBlast } from './botBlast';
import { restoreLife, getLifeBonus } from '../../modules/wordHuntManager';

/** Score target ratios per difficulty — bots aim for this % of best human score */
const BOT_SCORE_TARGET: Record<string, number> = {
  easy: 0.75,    // Easy bots aim for ~75% of best human
  medium: 0.95,  // Medium bots aim for ~95%
  hard: 1.15,    // Hard bots aim for ~115% — can beat you
};

/**
 * Grace period (ms) during which bots score freely at the start of a round.
 * Before any human has scored, we want bots to appear active immediately —
 * an absolute point-ceiling was too easy to hit on a single Blast word with
 * tile bonuses, which silently froze bots for the whole round. Instead we
 * gate only on time: bots play without restriction until either a human
 * scores (switching to the relative target below) or the grace window ends.
 */
const BOT_FREE_SCORING_GRACE_MS = 25_000;

/** Fallback ceiling applied only AFTER the grace window if no human has scored. */
const BOT_POST_GRACE_CEILING: Record<string, number> = {
  easy: 400,
  medium: 650,
  hard: 900,
};

/** Per-game timestamps for when scoring started (used for grace-window logic). */
const gameScoringStart = new Map<string, number>();

export function markBotScoringStart(gameCode: string): void {
  gameScoringStart.set(gameCode, Date.now());
}

export function clearBotScoringStart(gameCode: string): void {
  gameScoringStart.delete(gameCode);
}

/**
 * Per-(gameCode, bot) variance cache. Without this, shouldBotScore recomputes
 * Math.random on every call — a bot near the target line flickers between
 * accept/reject across submissions inside the same game. Memoize once per bot
 * per game so the target is a stable line.
 */
const gameBotVariance = new Map<string, number>();

function varianceKey(gameCode: string, botUsername: string): string {
  return `${gameCode}:${botUsername}`;
}

function getOrSeedVariance(gameCode: string, botUsername: string): number {
  const key = varianceKey(gameCode, botUsername);
  const cached = gameBotVariance.get(key);
  if (cached !== undefined) return cached;
  const v = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
  gameBotVariance.set(key, v);
  return v;
}

export function clearBotVariance(gameCode: string): void {
  const prefix = `${gameCode}:`;
  for (const key of gameBotVariance.keys()) {
    if (key.startsWith(prefix)) gameBotVariance.delete(key);
  }
}

/**
 * Per-game throttle timestamps for per-word bot resync.
 * Prevents running the grid solver on every word (300+ calls in a 3-bot game).
 * Bots only need to resync at most every ~2s to avoid exhausting their word pool.
 */
const lastBotResyncAt = new Map<string, number>();

export function clearBotResyncThrottle(gameCode: string): void {
  lastBotResyncAt.delete(gameCode);
}

/**
 * Get the best human (non-bot) player's score in a game.
 */
export function getBestHumanScore(gameCode: string): number {
  const leaderboard = getLeaderboard(gameCode);
  let best = 0;
  for (const entry of leaderboard) {
    if (!entry.isBot && entry.score > best) {
      best = entry.score;
    }
  }
  return best;
}

/**
 * Per-mode tuning for the bot scoring gate. Lets short, fast modes (Wheel Rush)
 * run gentler bots than the default classic calibration WITHOUT forking the
 * shared gate. All multipliers default to 1 (no change) and graceMs defaults to
 * the module-wide grace window.
 */
export interface BotScoreTuning {
  /** Multiplier on the relative score target (<1 = bots aim lower vs best human). */
  targetMult?: number;
  /** Multiplier on the per-difficulty minimum-score floor (<1 = lower guaranteed bot score). */
  floorMult?: number;
  /** Multiplier on the post-grace fallback ceiling. */
  ceilingMult?: number;
  /** Override the free-scoring grace window (ms) before any human has scored. */
  graceMs?: number;
}

/** Minimum floor: bots always get at least this many points before capping kicks in. */
const MIN_BOT_SCORE: Record<string, number> = { easy: 80, medium: 150, hard: 250 };

/**
 * Check whether a bot should be allowed to score.
 * Bots target a percentage of the best human's score (difficulty-dependent).
 * This creates competitive pressure without making bots unbeatable.
 * A ±10% random variance is applied to the target to feel natural.
 *
 * `tuning` lets a caller (e.g. the Wheel Rush driver) soften the bots for a
 * short mode where the classic calibration is disproportionately strong.
 */
export function shouldBotScore(
  gameCode: string,
  botUsername: string,
  currentBotScore: number,
  pendingScore: number,
  botDifficulty: string = 'medium',
  tuning?: BotScoreTuning
): boolean {
  const bestHuman = getBestHumanScore(gameCode);
  const projectedScore = currentBotScore + pendingScore;

  if (bestHuman === 0) {
    // No human scored yet. Use a time-based grace window instead of a hard
    // point ceiling, because Blast tile bonuses routinely exceed small ceilings
    // on the first word and would otherwise freeze the bot permanently.
    const graceMs = tuning?.graceMs ?? BOT_FREE_SCORING_GRACE_MS;
    const startedAt = gameScoringStart.get(gameCode);
    if (!startedAt || Date.now() - startedAt <= graceMs) {
      return true;
    }
    // Grace window elapsed with no human activity — fall back to a much
    // looser ceiling so bots still contribute rather than going silent.
    const baseCeiling = BOT_POST_GRACE_CEILING[botDifficulty] ?? BOT_POST_GRACE_CEILING.medium;
    return projectedScore <= baseCeiling * (tuning?.ceilingMult ?? 1);
  }

  const baseTarget = BOT_SCORE_TARGET[botDifficulty] ?? BOT_SCORE_TARGET.medium;
  // Per-(game,bot) variance (±10%), memoized so the target line doesn't
  // flicker as Math.random drifts across consecutive submissions.
  const variance = getOrSeedVariance(gameCode, botUsername);
  const scoreTarget = bestHuman * baseTarget * variance * (tuning?.targetMult ?? 1);

  const baseFloor = MIN_BOT_SCORE[botDifficulty] ?? MIN_BOT_SCORE.medium;
  const floor = baseFloor * (tuning?.floorMult ?? 1);

  return projectedScore <= Math.max(scoreTarget, floor);
}

/**
 * Start bots for a game
 *
 * Note: Bot initialization is async but we don't await to avoid blocking the game timer.
 * Each bot tracks its own start time to calculate accurate remaining game time.
 */
export function startBotsForGame(
  io: Server,
  gameCode: string,
  letterGrid: LetterGrid | null,
  language: Language,
  timerSeconds: number
): void {
  const bots: Bot[] = botManager.getGameBots(gameCode);
  if (bots.length === 0) return;

  const game = getGame(gameCode);
  const isWordHunt = game?.gameMode === 'word-hunt' && game.wordHuntState;

  // Wheel-rush has no grid; dispatch to its dedicated bot driver.
  if (game?.gameMode === 'wheel-rush' && game.wheelRushState) {
    markBotScoringStart(gameCode);
    // Async (awaits dictionary warmup); fire-and-forget from this sync dispatcher.
    void startBotsForWheelRush(io, gameCode, bots, game.wheelRushState, language, timerSeconds)
      .catch(err => logger.error('BOT', `wheel-rush bot start failed for ${gameCode}: ${(err as Error).message}`));
    return;
  }

  // Blast mode: dispatch to dedicated bot driver. Bots solve CURRENT shared board,
  // not a static grid, and submissions mutate the board via the human validation path.
  if (game?.gameMode === 'blast' && game.blastModeState) {
    markBotScoringStart(gameCode);
    // Async (awaits dictionary warmup); fire-and-forget from this sync dispatcher.
    void startBotsForBlast(io, gameCode, bots, game.blastModeState, language, timerSeconds)
      .catch(err => logger.error('BOT', `blast bot start failed for ${gameCode}: ${(err as Error).message}`));
    return;
  }

  // Safety check: ensure letterGrid is valid before starting bots
  if (!letterGrid || !Array.isArray(letterGrid) || letterGrid.length === 0) {
    logger.error('BOT', `Cannot start bots for game ${gameCode}: letterGrid is invalid`);
    return;
  }

  logger.info('BOT', `Starting ${bots.length} bots for game ${gameCode}`);

  // Store game start time so bots can calculate actual remaining time.
  // Also mark scoring start for the bot grace-window in shouldBotScore.
  const gameStartTime = Date.now();
  markBotScoringStart(gameCode);

  for (const bot of bots) {
    botManager.startBot(
      bot,
      letterGrid,
      language,
      async (submission: BotSubmission) => {
        const { username, word, score, comboLevel } = submission;

        if (!bot || !bot.isActive) return;

        if (!word || typeof word !== 'string') {
          logger.warn('BOT', `Bot "${username}" submitted invalid word: ${word}`);
          return;
        }

        // Get current game state for mode-specific logic
        const currentGame = getGame(gameCode);

        // Bug fix: Calculate blast mode tile bonus (same as human path)
        let blastTileBonus = 0;
        if (currentGame?.gameMode === 'blast' && currentGame.blastModeState) {
          try {
            const blastState = currentGame.blastModeState;
            // Bot plays on its OWN independent board (per-player), so bot clears
            // never sync onto human players' boards.
            const board = getOrInitPlayerBoard(blastState, username);
            const boardPositions = makePositionsMap(board.grid, language);
            const tilesOnPath = getTilesOnPath(word, boardPositions, board.overlay, board.overlayMap);
            blastTileBonus = calculateBlastTileBonus(tilesOnPath);
            const gemCount = tilesOnPath.filter((t: string) => t === 'gem').length;
            recordBlastMove(blastState, username, comboLevel || 0, word, tilesOnPath.length, gemCount, blastTileBonus);

            // Mutate the bot's own board. NO broadcast — a bot's board is private
            // (no client renders it); broadcasting would corrupt humans' boards.
            if (board.grid && board.tileStates) {
              const wordPath = getWordPath(word, boardPositions);
              cascadeBlastWord(board, wordPath, word, blastState.wave ?? 1, language);

              // Throttled resync of bots' word pools against the bot's own grid so
              // they never go dry as it mutates.
              const nowTs = Date.now();
              if (nowTs - (lastBotResyncAt.get(gameCode) ?? 0) >= 2000) {
                lastBotResyncAt.set(gameCode, nowTs);
                void botManager.resyncBotsForNewGrid(
                  botManager.getGameBots(gameCode),
                  board.grid,
                  language,
                );
              }

              // Per-player board refresh (silent: no socket → bots don't emit).
              const regenerated = regenerateBlastBoardIfExhausted({
                io,
                gameCode,
                game: currentGame,
                username,
                board,
                newTileStates: board.tileStates,
              });
              if (regenerated) {
                lastBotResyncAt.set(gameCode, Date.now());
              }
            }
          } catch (err) {
            logger.error('BOT', `Blast bonus error for "${username}": ${(err as Error).message}`);
          }
        }

        // Word Hunt board bonus: extra score per letter for finding grid words
        const wordHuntBoardBonus = (currentGame?.gameMode === 'word-hunt' && currentGame.wordHuntState)
          ? word.length * BOARD_WORD_SCORE_PER_LETTER
          : 0;

        const totalScore = score + blastTileBonus + wordHuntBoardBonus;

        // Score cap: keep bot within competitive range of best human
        if (!shouldBotScore(gameCode, username, bot.score, totalScore, bot.difficulty)) {
          logger.info('BOT', `Bot "${username}" score capped at ${bot.score} (target reached for ${bot.difficulty})`);
          return false;
        }

        // Bug fix: Sync combo to server state (mirrors wordValidationHandler)
        if (currentGame) {
          if (!currentGame.playerCombos) currentGame.playerCombos = {};
          currentGame.playerCombos[username] = (comboLevel || 0) + 1;
        }

        addPlayerWord(gameCode, username, word, {
          autoValidated: true,
          score: totalScore,
          comboBonus: 0,
          comboLevel: comboLevel || 0,
          isBot: true,
        });

        // Record bot as first finder so humans get "found by other" feedback
        const isFirstFinder = recordFirstFinder(gameCode, word, username, bot.avatar);

        // Restore bot life in Word Hunt mode (same as humans)
        if (currentGame?.gameMode === 'word-hunt' && currentGame.wordHuntState) {
          try {
            const lifeBonus = getLifeBonus(word.length);
            restoreLife(currentGame.wordHuntState, username, lifeBonus);
            // Broadcast life update so frontend leaderboard shows bot life recovery
            broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntLifeUpdate', {
              playerLives: currentGame.wordHuntState.playerLives,
              eliminatedPlayers: currentGame.wordHuntState.eliminatedPlayers,
            });
          } catch { /* non-critical */ }
        }

        trackBotWord(gameCode, word, username, totalScore);
        updatePlayerScore(gameCode, username, totalScore, true);

        // Broadcast bot word activity so players see bots are playing
        volatileBroadcastToRoom(io, getGameRoom(gameCode), 'botWordFound', {
          username,
          word,
          score: totalScore,
          isFirstFinder,
        });

        // Also emit playerFoundWord so the frontend treats bot words like human words
        // (leaderboard updates, opponent activity feed, word count tracking)
        const playerWordCount = currentGame?.playerWords?.[username]?.length || 0;
        volatileBroadcastToRoom(io, getGameRoom(gameCode), 'playerFoundWord', {
          username,
          word,
          wordCount: playerWordCount,
          score: (currentGame?.playerScores?.[username] || 0),
          comboLevel: comboLevel || 0,
          isFirstFinder,
        });

        emitBotLeaderboard(io, gameCode);
        return totalScore;
      },
      timerSeconds,
      gameStartTime
    );
  }

  // Word Hunt: also start target-guessing loop AFTER classic word-finding init.
  // Must be after startBot() since startBot calls stopBot() which clears activeTimers.
  // Use setTimeout(0) to ensure startBot's sync initialization completes first.
  if (isWordHunt) {
    setTimeout(() => {
      const freshBots = botManager.getGameBots(gameCode);
      if (freshBots.length > 0) {
        // Async (awaits dictionary warmup); fire-and-forget inside this setTimeout.
        void startBotsForWordHunt(io, gameCode, freshBots, game!.wordHuntState!, language, timerSeconds)
          .catch(err => logger.error('BOT', `word-hunt bot start failed for ${gameCode}: ${(err as Error).message}`));
      }
    }, 100);
  }
}

/**
 * Re-register the bot AI instances for a game rehydrated from Redis after a
 * server restart. The Bot objects live only in `botManager` (in-memory) and are
 * lost on restart, but each bot's identity survived on its `game.users` entry.
 * Rebuild them (preserving username/id/avatar via botManager.restoreBotFromUser)
 * so a subsequent startBotsForGame finds them instead of an empty registry and
 * the bots resume playing. Returns the number restored. No-op for bots already
 * registered (normal live reconnect).
 */
export function restoreBotsForGame(gameCode: string): number {
  const game = getGame(gameCode);
  if (!game) return 0;
  let restored = 0;
  for (const [username, user] of Object.entries(game.users || {})) {
    const u = user as { isBot?: boolean; playerId?: string | null; avatar?: unknown; botDifficulty?: string };
    if (u?.isBot && botManager.restoreBotFromUser(gameCode, username, u, game.language || 'en')) {
      restored++;
    }
  }
  return restored;
}
