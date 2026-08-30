/**
 * Wheel Rush Bot Submission Scheduler
 *
 * Bots in wheel-rush mode have no round-event scheduler (unlike classic mode's
 * scheduleRoundEvent). Without this module they sit at 0 points forever — no
 * submitWord handler fires for them because there is no timer-driven trigger.
 *
 * This module creates simulated submissions at staggered intervals using real
 * dictionary traversal so words look natural (not constant or obviously fake).
 */

import type { Server } from 'socket.io';
import type { Language, WheelRushModeState } from '@/shared/types/game';
import { WHEEL_RUSH_MIN_WORD_LEN } from '@/shared/constants/wheelRushConstants';
import { getCachedTrie, getTrieNode } from './boggleSolver';
import { getGame, updateGame, updatePlayerScore, addPlayerWord } from './gameStateManager';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers';
import logger from '../utils/logger';

interface PendingSubmission {
  word: string;
  username: string;
  scheduledAt: number; // absolute timestamp
}

/** Outcome returned by internal wheel-word scoring (mirrors applyWheelWord signature). */
interface WheelApplyOutcome {
  score: number;
  firstFinder: boolean;
  firstFinderBonus: number;
  repeat: boolean;
}

/** Filter an anagram-set candidate to only valid wheel-shape words. */
function passesWheelConstraints(
  word: string,
  centerLetter: string,
  allLetters: string[],
): boolean {
  if (word.length < WHEEL_RUSH_MIN_WORD_LEN) return false;
  const upper = word.toUpperCase();
  if (!upper.includes(centerLetter)) return false;
  const avail = new Map<string, number>();
  for (const l of allLetters) {
    const u = l.toUpperCase();
    avail.set(u, (avail.get(u) || 0) + 1);
  }
  for (const c of upper) {
    const n = avail.get(c);
    if (!n || n <= 0) return false;
    avail.set(c, n - 1);
  }
  return true;
}

/**
 * Generate a deterministic set of candidate words from the trie that are
 * findable given the wheel letters + language. Traverses the trie to depth
 * maxLen (default 9) and collects every leaf node whose path uses only
 * available letters and includes the center letter.
 *
 * Returns up to `maxCandidates` words — enough variety for realistic simulation
 * without excessive CPU cost at game-start time.
 */
export function generateCandidateWords(
  language: Language,
  puzzle: { centerLetter: string; allLetters: string[] },
  maxCandidates: number = 60,
): string[] {
  const trie = getCachedTrie(language);
  if (!trie) return [];

  const results: string[] = [];
  const seen = new Set<string>();

  /** DFS traversal from root, tracking accumulated path. */
  function dfs(node: Record<string, unknown>, path: string[]): void {
    if (results.length >= maxCandidates) return;

    // Check current prefix (trimmed of duplicates for multi-letter chars)
    const word = path.join('').toLowerCase();

    // Pruning: if we've used too many unique chars beyond available, stop
    const uniqueChars = new Set(path.map(p => p.toLowerCase()));
    const availUnique = new Set(puzzle.allLetters.map(l => l.toLowerCase()));
    if ([...uniqueChars].length > availUnique.size) return;

    // If current path forms a valid word AND passes wheel constraints, record it
    if (node.isWord && word.length >= WHEEL_RUSH_MIN_WORD_LEN) {
      const candidate = word.toUpperCase();
      if (!seen.has(candidate) && passesWheelConstraints(candidate, puzzle.centerLetter, puzzle.allLetters)) {
        seen.add(candidate);
        results.push(candidate);
      }
    }

    // Only continue DFS if we haven't exceeded max word length
    if (path.length >= 9) return;

    // Recurse into children, pruning by available letters
    for (const key of Object.keys(node)) {
      if (key === 'isWord') continue; // leaf marker, not a child
      const childChar = key.toLowerCase();
      if (!availUnique.has(childChar)) continue;

      // Check letter availability (accounting for duplicates)
      const usedCounts = new Map<string, number>();
      for (const p of path) usedCounts.set(p.toLowerCase(), (usedCounts.get(p.toLowerCase()) ?? 0) + 1);
      usedCounts.set(childChar, (usedCounts.get(childChar) ?? 0) + 1);

      for (const [availChar, count] of availUnique) {
        const needed = usedCounts.get(availChar) ?? 0;
        const available = puzzle.allLetters.filter(l => l.toLowerCase() === availChar).length;
        if (needed > available) continue;
      }

      dfs(node[key] as Record<string, unknown>, [...path, key]);
    }
  }

  dfs(trie as Record<string, unknown>, []);
  return results;
}

/** Pick N candidates randomly (Fisher-Yates partial shuffle). */
function pickRandom(words: string[], n: number): string[] {
  if (words.length === 0) return [];
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > Math.max(0, shuffled.length - n - 1); i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

/**
 * Schedule bot word submissions for a wheel-rush game.
 *
 * Picks random candidates from the playable word set and stagers them across
 * the game duration (with some jitter). Each submission emits the same
 * payload as a human client would, including leaderboard updates.
 *
 * @param io Socket.IO server instance
 * @param gameCode Room code to operate on
 * @param durationSec Game duration in seconds (from startGame payload)
 */
export function scheduleWheelRushBots(
  io: Server,
  gameCode: string,
  durationSec: number,
): void {
  const game = getGame(gameCode);
  if (!game || !game.wheelRushState) {
    logger.warn('WHEEL_BOT', `scheduleWheelRushBots: no game/state for ${gameCode}`);
    return;
  }

  const state = game.wheelRushState;
  const lang = (game.language || 'en') as Language;
  const players = Object.keys(state.foundWords);
  if (players.length === 0) return;

  // Skip bots — only schedule for non-bot usernames
  const botUsernames = players.filter(p => p.startsWith('bot_'));
  const humanOrNonBotPlayers = players.filter(p => !p.startsWith('bot_'));

  // Always schedule for bots if any exist
  if (botUsernames.length === 0) return;

  const candidates = generateCandidateWords(lang, state.puzzle);
  if (candidates.length === 0) {
    logger.warn('WHEEL_BOT', `No candidates for ${gameCode} lang=${lang} — skipping bot scheduling`);
    return;
  }

  // Schedule ~3-5 words per bot over the game duration
  const intervalMs = (durationSec * 1000) / Math.max(botUsernames.length, 1);
  const wordsPerBot = Math.min(5, Math.max(2, Math.floor(candidates.length / botUsernames.length)));

  for (const username of botUsernames) {
    const picks = pickRandom(candidates, wordsPerBot);
    for (let i = 0; i < picks.length; i++) {
      const word = picks[i];
      // Stagger: base offset + small random jitter per word
      const delayMs = intervalMs * i + Math.random() * Math.min(intervalMs * 0.5, 3000);
      const absTime = Date.now() + delayMs;

      setTimeout(() => {
        const g = getGame(gameCode);
        if (!g || !g.wheelRushState || g.gameState !== 'in-progress') return;

        const s = g.wheelRushState;
        // Defensive: ensure foundWords entry exists
        if (!s.foundWords[username]) {
          s.foundWords[username] = [];
        }

        // Apply the word (uses same logic as human submission)
        const { score, firstFinder, firstFinderBonus, repeat } = applyWheelWordInternal(s, username, word.toUpperCase());

        updatePlayerScore(gameCode, username, score, true);
        addPlayerWord(gameCode, username, word.toUpperCase(), {
          score,
          validated: true,
          autoValidated: true,
        });

        broadcastToRoom(io, getGameRoom(gameCode), 'wheelWordFound', {
          word: word.toUpperCase(),
          by: username,
          firstFinder,
        });

        emitWheelLeaderboard(io, gameCode);

        logger.info('WHEEL_BOT', `${username} found "${word}" in ${gameCode} (+${score}${firstFinder ? ' first-find' : repeat ? ' repeat' : ''})`);
      }, Math.round(delayMs));
    }
  }
}

/**
 * Internal copy of the scoring logic from wheelRushManager.applyWheelWord,
 * adapted to work without mutating shared module state externally.
 */
function applyWheelWordInternal(
  state: WheelRushModeState,
  username: string,
  word: string,
): WheelApplyOutcome {
  const upper = word.toUpperCase();
  const userList = state.foundWords[username] ?? (state.foundWords[username] = []);
  const repeat = userList.includes(upper);

  if (!state.firstFinders) state.firstFinders = {};
  const isFirstFinder = !(upper in state.firstFinders);
  if (isFirstFinder) state.firstFinders[upper] = username;

  const baseScore = calculateWheelScore(upper, state.puzzle.allLetters);
  const firstFinderBonus = isFirstFinder ? 10 : 0; // WHEEL_RUSH_FIRST_FINDER_BONUS

  let score: number;
  if (!repeat) {
    score = baseScore + firstFinderBonus;
  } else {
    // Repeat bonus paid once per word per player
    if (!state.repeatCredited) state.repeatCredited = {};
    const credited = state.repeatCredited[username] ?? (state.repeatCredited[username] = []);
    const alreadyCredited = credited.includes(upper);
    score = alreadyCredited ? 0 : Math.max(1, Math.round(baseScore * 0.7)); // 0.7 ≈ WHEEL_RUSH_REPEAT_SCORE_FACTOR
    if (!alreadyCredited) credited.push(upper);
  }

  if (!repeat) userList.push(upper);
  if (!state.playerStats) state.playerStats = {};
  if (!state.playerStats[username]) {
    state.playerStats[username] = { wordsLocked: 0, wordsStolen: 0, wordsStolenFromMe: 0, bestWord: '', totalScore: 0 };
  }
  const stats = state.playerStats[username];
  if (!repeat) stats.wordsLocked += 1;
  if (isFirstFinder) stats.wordsStolen += 1;
  stats.totalScore += score;
  if (upper.length > stats.bestWord.length) stats.bestWord = upper;

  return { score, firstFinder: isFirstFinder, firstFinderBonus, repeat };
}

function calculateWheelScore(word: string, allLetters: string[]): number {
  // Simple length-based scoring matching the canonical curve
  const len = word.length;
  if (len < 3) return 0;
  if (len <= 4) return 1;
  if (len <= 5) return 2;
  if (len <= 7) return 3;
  if (len <= 9) return 5;
  if (len <= 12) return 8;
  if (len <= 15) return 11;
  return 15;
}

/** Emit leaderboard to room (mirrors handleSubmitWheelWord pattern). */
function emitWheelLeaderboard(io: Server, gameCode: string): void {
  const game = getGame(gameCode);
  if (!game) return;

  // Rebuild leaderboard from playerStats
  const leaderboard: Array<{ username: string; score: number }> = [];
  if (game.wheelRushState?.playerStats) {
    for (const [username, stats] of Object.entries(game.wheelRushState.playerStats)) {
      leaderboard.push({ username, score: stats.totalScore || 0 });
    }
  }
  leaderboard.sort((a, b) => b.score - a.score);

  broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
}
