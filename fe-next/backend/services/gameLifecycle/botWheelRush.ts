/**
 * Bot Wheel Rush
 *
 * Enumerates valid wheel-rush words from the puzzle letter set + language trie,
 * then drip-feeds submissions per bot using the shared bot-lifecycle scheduler.
 * Mirrors the human wheelRushHandler path: validateWheelSubmission → applyWheelWord →
 * score gate → updatePlayerScore → broadcast wheelWordLocked / wheelWordStolen, and
 * schedules the same reap timer key so locks close at window expiry.
 */

import type { Server } from 'socket.io';
import type { Language, WheelPuzzle, WheelRushModeState } from '@/shared/types/game';
import type { Bot } from '../../modules/botBehavior';
import { getGame, updatePlayerScore, addPlayerWord } from '../../modules/gameStateManager';
import { incrementBotWordUsage } from '../../modules/supabaseServer';
import {
  getLeaderboardThrottled,
  type LeaderboardPlayer,
  type ScoreGameBase,
} from '../../modules/scoreManager';
import { getCachedTrie, type TrieNode } from '../../modules/boggleSolver';
import {
  applyWheelWord,
  reapExpiredLocks,
  validateWheelSubmission,
} from '../../modules/wheelRushManager';
import { broadcastToRoom, volatileBroadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import timerManager from '../../utils/timerManager';
import { setBotTimeout } from '../../modules/botLifecycle';
import { ensureLanguageLoaded } from '../../dictionary';
import { shouldBotScore, type BotScoreTuning } from './botGame';
import { BOT_CONFIG } from '../../modules/botConfig';
import { WHEEL_RUSH_MIN_WORD_LEN } from '@/shared/constants/wheelRushConstants';
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
  targetMult: 0.7,   // hard ≈ 0.80×, medium ≈ 0.67×, easy ≈ 0.53× of best human
  floorMult: 0.4,    // floors → easy 32 / medium 60 / hard 100
  ceilingMult: 0.6,  // gentler fallback if nobody has scored yet
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

function scheduleReap(
  io: Server,
  gameCode: string,
  word: string,
  lockUntil: number,
): void {
  const now = Date.now();
  timerManager.setTimeout(`wheelRushReap:${gameCode}:${word}`, () => {
    const g = getGame(gameCode);
    if (!g?.wheelRushState) return;
    const closed = reapExpiredLocks(g.wheelRushState);
    for (const c of closed) {
      broadcastToRoom(io, getGameRoom(gameCode), 'wheelWordClosed', {
        word: c.word, finder: c.finder,
      });
    }
  }, Math.max(0, lockUntil - now) + 50);
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

  const now = Date.now();
  const outcome = applyWheelWord(state, bot.username, word, now);

  if (outcome.kind === 'locked') {
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
    broadcastToRoom(io, getGameRoom(gameCode), 'wheelWordLocked', {
      word, by: bot.username, lockUntil: outcome.lockUntil,
    });
    broadcastWheelLeaderboard(io, gameCode);
    scheduleReap(io, gameCode, word, outcome.lockUntil);
    logger.info('BOT_WHEEL', `${bot.username} locked "${word}" (+${total})`);
    return;
  }

  if (outcome.kind === 'stolen') {
    const total = outcome.score + outcome.stealBonus;
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
    broadcastToRoom(io, getGameRoom(gameCode), 'wheelWordStolen', {
      word, by: bot.username, from: outcome.from,
    });
    broadcastWheelLeaderboard(io, gameCode);
    logger.info('BOT_WHEEL', `${bot.username} stole "${word}" from ${outcome.from} (+${total})`);
  }
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
  const timing = BOT_CONFIG.TIMING[bot.difficulty] || BOT_CONFIG.TIMING.medium;

  const firstDelay = timing.startDelay + Math.random() * 1500;

  const tick = (idx: number): void => {
    if (!bot.isActive || idx >= words.length) return;
    const remaining = gameEndTime - Date.now();
    if (remaining <= 500) return;

    submitOneWord(io, gameCode, bot, state, words[idx], language);

    const delay = timing.minDelay + Math.random() * (timing.maxDelay - timing.minDelay);
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

  for (const bot of bots) {
    bot.isActive = true;
    // Shuffled slice so bots diverge — also acts as a soft per-bot cap. Trimmed
    // for the short 60s round so bots can't out-volume a focused human (see
    // WHEEL_RUSH_BOT_TUNING for the matching score-ceiling softening).
    const perBotCap = bot.difficulty === 'hard' ? 18 : bot.difficulty === 'medium' ? 12 : 8;
    const words = shuffle(allCandidates).slice(0, perBotCap);
    scheduleBot(io, gameCode, bot, state, words, language, gameEndTime);
    logger.info('BOT_WHEEL', `Bot "${bot.username}" queued ${words.length} wheel words for ${gameCode}`);
  }
}
