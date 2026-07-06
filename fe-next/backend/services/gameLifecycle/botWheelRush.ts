/**
 * Bot Wheel Rush
 *
 * Enumerates valid wheel-rush words from the puzzle letter set + language trie,
 * then drip-feeds submissions per bot using the shared bot-lifecycle scheduler.
 *
 * Difficulty balancing (see wheelRushConstants):
 *   - Artificial "thinking delay": each move is spaced by a random 3–7s interval
 *     instead of the classic sub-second bot cadence, so bots no longer appear to
 *     predict words instantly.
 *   - Per-turn success rate: on each turn a bot only sometimes lands its intended
 *     (best available) word — otherwise it misses (skips the turn) or downgrades
 *     to a shorter, lower-scoring word. Medium sits at ~65%.
 *
 * Scoring mirrors the human wheelRushHandler path (validateWheelSubmission →
 * applyWheelWord → score gate → updatePlayerScore) under the parallel-discovery
 * model — no locks, steals, or reaping.
 */

import type { Server } from 'socket.io';
import type { Language, WheelPuzzle, WheelRushModeState } from '@/shared/types/game';
import type { Bot } from '../../modules/botBehavior';
import { getGame, updatePlayerScore, addPlayerWord } from '../../modules/gameStateManager';
import { incrementBotWordUsage } from '../../modules/supabaseServer';
import { getCachedPlayerWords } from '../../modules/botBehaviorCache';
import { orderWordPoolByFrequencyBand, MIN_CORPUS_FOR_BANDING } from '../../modules/wordFrequencyBanding';
import {
  getLeaderboardThrottled,
  type LeaderboardPlayer,
  type ScoreGameBase,
} from '../../modules/scoreManager';
import { getCachedTrie, type TrieNode } from '../../modules/boggleSolver';
import {
  applyWheelWord,
  validateWheelSubmission,
} from '../../modules/wheelRushManager';
import { broadcastToRoom, volatileBroadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import { setBotTimeout } from '../../modules/botLifecycle';
import { ensureLanguageLoaded } from '../../dictionary';
import { shouldBotScore, type BotScoreTuning } from './botGame';
import {
  WHEEL_RUSH_MIN_WORD_LEN,
  WHEEL_RUSH_BOT_THINK_MIN_MS,
  WHEEL_RUSH_BOT_THINK_MAX_MS,
  WHEEL_RUSH_BOT_SUCCESS_RATE,
  WHEEL_RUSH_BOT_SKIP_ON_MISS,
} from '@/shared/constants/wheelRushConstants';
import logger from '../../utils/logger';

/**
 * Wheel Rush is a SHORT (60s) mode, so the classic bot calibration — a 25s
 * free-scoring grace window, hard bots aiming for 115% of the best human, and a
 * 250-point floor — made bots dominate the leaderboard. These knobs soften them:
 * the grace window roughly matches the 10s fog, hard bots cap below the human,
 * and the floor drops so a modest human round can't be lapped by a guaranteed
 * bot floor. See shouldBotScore / BotScoreTuning.
 */
const WHEEL_RUSH_BOT_TUNING: BotScoreTuning = {
  targetMult: 0.55,  // lowered again — hard ≈ 0.65×, medium ≈ 0.55×, easy ≈ 0.4× of best human
  floorMult: 0.3,    // floors → easy 24 / medium 45 / hard 75
  ceilingMult: 0.45, // gentler fallback if nobody has scored yet
  graceMs: 9_000,    // ≈ fog duration, not the classic 25s
};

/**
 * DFS trie walk over the wheel letter bag. Each outer letter usable at most
 * once, center required. Returns uppercase words meeting minLen.
 */
export function enumerateWheelWords(
  puzzle: WheelPuzzle,
  trie: TrieNode,
  minLen: number,
): string[] {
  const center = puzzle.centerLetter.toLowerCase();
  const bag: Record<string, number> = {};
  for (const l of puzzle.allLetters) {
    const k = l.toLowerCase();
    bag[k] = (bag[k] || 0) + 1;
  }

  const results: string[] = [];
  const prefix: string[] = [];

  function walk(node: TrieNode, usedCenter: boolean): void {
    if (node.isWord === true && usedCenter && prefix.length >= minLen) {
      results.push(prefix.join('').toUpperCase());
    }
    for (const ch of Object.keys(node)) {
      if (ch === 'isWord') continue;
      if (!bag[ch]) continue;
      const child = node[ch];
      if (!child || typeof child !== 'object') continue;
      bag[ch] -= 1;
      prefix.push(ch);
      walk(child as TrieNode, usedCenter || ch === center);
      prefix.pop();
      bag[ch] += 1;
    }
  }

  walk(trie, false);
  return results;
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function broadcastWheelLeaderboard(io: Server, gameCode: string): void {
  const game = getGame(gameCode);
  if (!game) return;
  const lbThrottleMs = parseInt(process.env.LEADERBOARD_THROTTLE_MS || '500');
  getLeaderboardThrottled(game as unknown as ScoreGameBase, gameCode, (leaderboard: LeaderboardPlayer[]) => {
    volatileBroadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
  }, lbThrottleMs);
}

/** Random artificial think delay (ms) for a bot's next move. */
export function botThinkDelay(rng: () => number = Math.random): number {
  const span = WHEEL_RUSH_BOT_THINK_MAX_MS - WHEEL_RUSH_BOT_THINK_MIN_MS;
  return WHEEL_RUSH_BOT_THINK_MIN_MS + rng() * span;
}

export type WheelBotMove =
  | { action: 'submit'; word: string }
  | { action: 'skip' };

/**
 * Decide a bot's move for one turn given a per-difficulty success rate.
 *
 *   - With probability `successRate`, submit the intended (best available) word.
 *   - Otherwise it's a MISS: either skip the turn entirely, or downgrade to a
 *     shorter word from the remaining pool (so the bot occasionally finds a
 *     lesser word instead of the optimal one).
 *
 * Pure + rng-injectable for deterministic tests. `pool` should be the bot's
 * remaining candidate words (used only to source a shorter downgrade word).
 */
export function decideBotWheelMove(
  intended: string,
  pool: string[],
  successRate: number,
  rng: () => number = Math.random,
): WheelBotMove {
  if (rng() < successRate) return { action: 'submit', word: intended };

  // Miss: sometimes skip, sometimes downgrade to a shorter word.
  if (rng() < WHEEL_RUSH_BOT_SKIP_ON_MISS) return { action: 'skip' };

  const shorter = pool.filter(w => w.length < intended.length && w !== intended);
  if (shorter.length === 0) return { action: 'skip' };
  // Pick the shortest available — the most conservative "I only saw a small word" miss.
  const word = shorter.reduce((a, b) => (b.length < a.length ? b : a));
  return { action: 'submit', word };
}

function submitOneWord(
  io: Server,
  gameCode: string,
  bot: Bot,
  state: WheelRushModeState,
  word: string,
  language: Language,
): void {
  if (!bot.isActive) return;

  const validation = validateWheelSubmission(state, word, language);
  if (!validation.valid) {
    logger.debug('BOT_WHEEL', `[${bot.username}] reject "${word}" — ${validation.error}`);
    return;
  }

  const outcome = applyWheelWord(state, bot.username, word, Date.now());
  const total = outcome.score;
  if (!shouldBotScore(gameCode, bot.username, bot.score, total, bot.difficulty, WHEEL_RUSH_BOT_TUNING)) return;
  bot.score += total;
  updatePlayerScore(gameCode, bot.username, total, true);
  addPlayerWord(gameCode, bot.username, word, {
    score: total,
    validated: true,
    autoValidated: true,
    isBot: true,
  });
  void incrementBotWordUsage(word, language);
  // Opponent-activity ping — parallel discovery, no locking side effects.
  broadcastToRoom(io, getGameRoom(gameCode), 'wheelWordFound', {
    word, by: bot.username, firstFinder: outcome.firstFinder,
  });
  broadcastWheelLeaderboard(io, gameCode);
  logger.info('BOT_WHEEL', `${bot.username} found "${word}" (+${total}${outcome.firstFinder ? ' first-find' : ''})`);
}

function scheduleBot(
  io: Server,
  gameCode: string,
  bot: Bot,
  state: WheelRushModeState,
  words: string[],
  language: Language,
  gameEndTime: number,
): void {
  if (!bot.isActive || words.length === 0) return;
  const successRate = WHEEL_RUSH_BOT_SUCCESS_RATE[bot.difficulty] ?? WHEEL_RUSH_BOT_SUCCESS_RATE.medium;

  // First move waits a full think-delay too — no more near-instant opening word.
  const firstDelay = botThinkDelay();

  const tick = (idx: number): void => {
    if (!bot.isActive || idx >= words.length) return;
    const remaining = gameEndTime - Date.now();
    if (remaining <= 500) return;

    // Per-turn success gate: land the intended word, miss (skip), or downgrade.
    const move = decideBotWheelMove(words[idx], words.slice(idx + 1), successRate);
    if (move.action === 'submit') {
      submitOneWord(io, gameCode, bot, state, move.word, language);
    } else {
      logger.debug('BOT_WHEEL', `[${bot.username}] missed turn (skipped "${words[idx]}")`);
    }

    const delay = botThinkDelay();
    if (delay >= remaining - 500) return;
    setBotTimeout(bot, () => tick(idx + 1), delay);
  };

  setBotTimeout(bot, () => tick(0), firstDelay);
}

/**
 * Kick off wheel-rush bot play for every bot in a game.
 */
export async function startBotsForWheelRush(
  io: Server,
  gameCode: string,
  bots: Bot[],
  state: WheelRushModeState,
  language: Language,
  timerSeconds: number,
): Promise<void> {
  if (!bots || bots.length === 0) return;

  // Recovery paths (server restart/redeploy → resumeGameTimerIfMissing, reconnect,
  // late-join) relaunch bots WITHOUT the gameStartHandler dictionary pre-load. On a
  // cold singleton getCachedTrie returns null and we'd bail below — bots flatline at
  // 0 and the leaderboard freezes for everyone. Warm the dict first, like the classic
  // bot driver (botBehavior). No-op when already loaded.
  await ensureLanguageLoaded(language);

  const trie = getCachedTrie(language);
  if (!trie) {
    logger.warn('BOT_WHEEL', `No trie for language ${language}; skipping`);
    return;
  }

  const allCandidates = enumerateWheelWords(state.puzzle, trie, WHEEL_RUSH_MIN_WORD_LEN);
  if (allCandidates.length === 0) {
    logger.warn('BOT_WHEEL', `No wheel candidates for ${gameCode}`);
    return;
  }

  const gameEndTime = Date.now() + timerSeconds * 1000;

  logger.info('BOT_WHEEL', `Game ${gameCode} (${language}): ${allCandidates.length} candidate wheel words for ${bots.length} bots`);

  // Rank candidates by real player frequency so bots pick human-plausible words
  // (easy → common first, hard → reach into rare real words) instead of a blind
  // shuffle. Enumerated wheel words are UPPERCASE; player_words are lowercase, so
  // key the rank map by uppercase. Falls back to shuffle when the corpus is thin.
  const playerWords = await getCachedPlayerWords(language);
  const rankByWord = playerWords.length >= MIN_CORPUS_FOR_BANDING
    ? new Map(playerWords.map((w, i) => [w.toUpperCase(), i]))
    : null;

  for (const bot of bots) {
    bot.isActive = true;
    // Banded (or shuffled) slice so bots diverge — also acts as a soft per-bot cap.
    // Trimmed for the short 60s round so bots can't out-volume a focused human (see
    // WHEEL_RUSH_BOT_TUNING for the matching score-ceiling softening).
    const perBotCap = bot.difficulty === 'hard' ? 14 : bot.difficulty === 'medium' ? 9 : 6;
    const ordered = rankByWord
      ? orderWordPoolByFrequencyBand(allCandidates, rankByWord, playerWords.length, bot.difficulty)
      : shuffle(allCandidates);
    const words = ordered.slice(0, perBotCap);
    scheduleBot(io, gameCode, bot, state, words, language, gameEndTime);
    logger.info('BOT_WHEEL', `Bot "${bot.username}" queued ${words.length} wheel words for ${gameCode}`);
  }
}
