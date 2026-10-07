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
 * What is Wheel-Rush-specific lives here: the word pool (trie walk over the
 * wheel letters, frequency-banded per difficulty), the think-delay + per-turn
 * success pacing, and pricing/claiming a word through the same wheelRushManager
 * calls as the human handler (validateWheelSubmission → applyWheelWord), with
 * the wheel's own activity event. Scheduling, gating and crediting are the
 * shared bot engine (botEngine.ts).
 */

import type { Server } from 'socket.io';
import type { Language, WheelPuzzle, WheelRushModeState } from '@/shared/types/game';
import type { Bot } from '../../modules/botBehavior';
import { getCachedPlayerWords } from '../../modules/botBehaviorCache';
import { orderWordPoolByFrequencyBand, MIN_CORPUS_FOR_BANDING } from '../../modules/wordFrequencyBanding';
import { getCachedTrie, type TrieNode } from '../../modules/boggleSolver';
import {
  applyWheelWord,
  scoreWheelWord,
  validateWheelSubmission,
} from '../../modules/wheelRushManager';
import { broadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import { ensureLanguageLoaded } from '../../dictionary';
import type { BotScoreTuning } from './botScoreGate';
import {
  activateBot,
  runWordBot,
  type BotPlayRules,
  type BotRoundContext,
} from './botEngine';
import {
  WHEEL_RUSH_MIN_WORD_LEN,
  WHEEL_RUSH_FIRST_FINDER_BONUS,
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

/**
 * Flatline guard: the score gate's hard-bot floor (75 pts — see
 * WHEEL_RUSH_BOT_TUNING / botScoreGate) sits below the cheapest 6-letter wheel
 * word (100 base + 5 first-finder), so while the best human stays cheap a bot
 * can ONLY bank 3–5-letter words. A slice front-loaded with >=6-letter words —
 * or with words live validation rejects (vowel-less shapes) — burns every turn
 * of the round and the bot ends at 0 (mpBotRounds wheel-rush CI flake; in real
 * rooms the bot just looks dead next to a low-scoring human).
 * Keep only words live validation accepts, then pull the first
 * GUARANTEED_AFFORDABLE sub-6-letter words to the front in their original
 * (banded/shuffled) order so every bot has a playable move from turn one.
 * Long/pangram words keep their relative order in the rest of the slice, so
 * difficulty banding still shapes what the bot plays once it is on the board.
 */
const GUARANTEED_AFFORDABLE = 5;
const AFFORDABLE_MAX_LEN = 5;

export function buildPlayableSlice(
  state: WheelRushModeState,
  ordered: string[],
  cap: number,
  language: Language,
): string[] {
  const playable = ordered.filter((w) => validateWheelSubmission(state, w, language).valid);
  const head: string[] = [];
  const tail: string[] = [];
  const headCap = Math.min(GUARANTEED_AFFORDABLE, cap);
  for (const w of playable) {
    if (head.length < headCap && w.length <= AFFORDABLE_MAX_LEN) head.push(w);
    else tail.push(w);
  }
  return [...head, ...tail].slice(0, cap);
}

function wheelRules(state: WheelRushModeState): BotPlayRules {
  return {
    tuning: WHEEL_RUSH_BOT_TUNING,
    quote(ctx: BotRoundContext, bot: Bot, word: string) {
      if (!validateWheelSubmission(state, word, ctx.language).valid) return null;
      const upper = word.toUpperCase();
      // Preview for the gate only; applyWheelWord in commit is authoritative.
      const firstFinderBonus = state.firstFinders && upper in state.firstFinders ? 0 : WHEEL_RUSH_FIRST_FINDER_BONUS;
      let firstFinder = false;
      return {
        wordScore: scoreWheelWord(upper, state.puzzle.allLetters) + firstFinderBonus,
        commit: () => {
          const outcome = applyWheelWord(state, bot.username, upper, Date.now());
          firstFinder = outcome.firstFinder;
          return outcome.score;
        },
        // Wheel's own opponent-activity ping (parallel discovery: no lock/steal events).
        announce: (credited: number) => {
          broadcastToRoom(ctx.io, getGameRoom(ctx.gameCode), 'wheelWordFound', { word: upper, by: bot.username, firstFinder });
          logger.info('BOT_WHEEL', `${bot.username} found "${upper}" (+${credited}${firstFinder ? ' first-find' : ''})`);
        },
      };
    },
  };
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

  // Recovery paths relaunch bots WITHOUT the start handler's dictionary load;
  // a cold trie would bail below and bots would flatline at 0.
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
  logger.info('BOT_WHEEL', `Game ${gameCode} (${language}): ${allCandidates.length} candidate wheel words for ${bots.length} bots`);

  // Rank by real player frequency so bots pick human-plausible words (easy →
  // common first, hard → rare real words). Enumerated words are UPPERCASE;
  // player_words are lowercase. Falls back to shuffle on a thin corpus.
  const playerWords = await getCachedPlayerWords(language);
  const rankByWord = playerWords.length >= MIN_CORPUS_FOR_BANDING
    ? new Map(playerWords.map((w, i) => [w.toUpperCase(), i]))
    : null;

  const ctx: BotRoundContext = { io, gameCode, language, gameEndTime: Date.now() + timerSeconds * 1000 };
  const rules = wheelRules(state);
  for (const bot of bots) {
    // Trimmed per-bot slice for the short round (soft cap; see WHEEL_RUSH_BOT_TUNING).
    const perBotCap = bot.difficulty === 'hard' ? 14 : bot.difficulty === 'medium' ? 9 : 6;
    const ordered = rankByWord
      ? orderWordPoolByFrequencyBand(allCandidates, rankByWord, playerWords.length, bot.difficulty)
      : shuffle(allCandidates);
    const words = buildPlayableSlice(state, ordered, perBotCap, language);
    const successRate = WHEEL_RUSH_BOT_SUCCESS_RATE[bot.difficulty] ?? WHEEL_RUSH_BOT_SUCCESS_RATE.medium;
    let idx = 0;
    activateBot(bot);
    runWordBot(ctx, bot, rules, {
      // Every move — the first one too — waits a full think-delay.
      firstDelay: () => botThinkDelay(),
      nextDelay: () => botThinkDelay(),
      pick: () => {
        if (idx >= words.length) return undefined;
        const intended = words[idx++];
        // Downgrades must skip words the bot already banked — replaying a found
        // word is rejected by playBotWord, which silently wastes the turn.
        const remaining = words.slice(idx).filter((w) => !bot.wordsFound.includes(w));
        const move = decideBotWheelMove(intended, remaining, successRate);
        return move.action === 'submit' ? move.word : null;
      },
    });
    logger.info('BOT_WHEEL', `Bot "${bot.username}" queued ${words.length} wheel words for ${gameCode}`);
  }
}
