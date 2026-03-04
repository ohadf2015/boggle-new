/**
 * Daily Word Hunt Facts Calculator
 *
 * Pure functions that analyze a player's Word Hunt result and stats
 * to produce witty, personalized "fun facts" for the results page.
 *
 * Follows the same calculator + card pattern as sessionStatsCalculator.ts.
 */

import type { WordHuntResult } from '@/utils/dailyChallenge';
import type { WordHuntStats } from '@/components/daily/results/types';
import { sanitizeWord } from '@/shared/utils/wordNormalization';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WordHuntFactType =
  | 'firstTry'
  | 'speedSolver'
  | 'topPerformer'
  | 'eliteClub'
  | 'efficiencyMachine'
  | 'letterDetective'
  | 'streakLegend'
  | 'closeCall'
  | 'lifeSaver'
  | 'wordExplorer'
  | 'fewerGuesses'
  | 'palindrome'
  | 'rareLetter'
  | 'longWord';

export interface WordHuntFact {
  type: WordHuntFactType;
  translationKey: string;
  translationParams: Record<string, string | number>;
  icon: string;
  color: 'neo-lime' | 'neo-cyan' | 'neo-orange' | 'neo-pink' | 'neo-yellow';
  value?: number | string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPEED_THRESHOLD_SECONDS = 90;
const TOP_PERCENTILE_THRESHOLD = 10;
const ELITE_SOLVE_RATE_THRESHOLD = 30;
const HIGH_EFFICIENCY_THRESHOLD = 80;
const LETTER_DETECTIVE_RATIO = 0.5;
const STREAK_LEGEND_DAYS = 7;
const CLOSE_CALL_LIFE_THRESHOLD = 15;
const LIFE_SAVER_THRESHOLD = 80;
const WORD_EXPLORER_MIN = 5;
const LONG_WORD_MIN_LENGTH = 7;
const RARE_LETTERS = ['Q', 'X', 'Z', 'J'];
const MAX_FACTS = 4;

// ---------------------------------------------------------------------------
// Fact Generators
// ---------------------------------------------------------------------------

/** #1: Solved in 1 attempt */
export function getFirstTryFact(
  result: WordHuntResult,
  stats: WordHuntStats
): WordHuntFact | null {
  if (!result.solved || result.attemptsUsed !== 1) return null;

  return {
    type: 'firstTry',
    translationKey: 'wordHunt.facts.firstTry',
    translationParams: { solveRate: stats.solveRate },
    icon: 'Sparkles',
    color: 'neo-yellow',
    value: 1,
  };
}

/** #2: Solved in under 90 seconds (measured by first→last attempt timestamps) */
export function getSpeedSolverFact(
  result: WordHuntResult,
  _stats: WordHuntStats
): WordHuntFact | null {
  if (!result.solved) return null;
  if (!result.attempts || result.attempts.length < 2) return null;

  const firstTimestamp = result.attempts[0].timestamp;
  const lastTimestamp = result.attempts[result.attempts.length - 1].timestamp;
  const durationSeconds = Math.round((lastTimestamp - firstTimestamp) / 1000);

  if (durationSeconds > SPEED_THRESHOLD_SECONDS || durationSeconds <= 0) return null;

  return {
    type: 'speedSolver',
    translationKey: 'wordHunt.facts.speedSolver',
    translationParams: { seconds: durationSeconds },
    icon: 'Zap',
    color: 'neo-cyan',
    value: `${durationSeconds}s`,
  };
}

/** #3: Top 10% of players */
export function getTopPerformerFact(
  _result: WordHuntResult,
  stats: WordHuntStats
): WordHuntFact | null {
  if (!stats.yourStats?.percentile) return null;
  if (stats.yourStats.percentile > TOP_PERCENTILE_THRESHOLD) return null;

  const othersBeaten = Math.round(
    stats.totalPlayers * (1 - stats.yourStats.percentile / 100)
  );

  return {
    type: 'topPerformer',
    translationKey: 'wordHunt.facts.topPerformer',
    translationParams: {
      percentile: stats.yourStats.percentile,
      others: othersBeaten,
    },
    icon: 'Crown',
    color: 'neo-yellow',
    value: `${stats.yourStats.percentile}%`,
  };
}

/** #4: Solved a hard puzzle (< 30% solve rate) */
export function getEliteClubFact(
  result: WordHuntResult,
  stats: WordHuntStats
): WordHuntFact | null {
  if (!result.solved) return null;
  if (stats.solveRate >= ELITE_SOLVE_RATE_THRESHOLD) return null;

  return {
    type: 'eliteClub',
    translationKey: 'wordHunt.facts.eliteClub',
    translationParams: { solveRate: stats.solveRate },
    icon: 'Shield',
    color: 'neo-pink',
  };
}

/** #5: High efficiency score (≥ 80) */
export function getEfficiencyMachineFact(
  result: WordHuntResult,
  _stats: WordHuntStats
): WordHuntFact | null {
  if (!result.efficiencyScore || result.efficiencyScore < HIGH_EFFICIENCY_THRESHOLD) return null;

  return {
    type: 'efficiencyMachine',
    translationKey: 'wordHunt.facts.efficiencyMachine',
    translationParams: { score: Math.round(result.efficiencyScore) },
    icon: 'Target',
    color: 'neo-lime',
    value: Math.round(result.efficiencyScore),
  };
}

/** #6: First guess had ≥ 50% correct letters (green or yellow) */
export function getLetterDetectiveFact(
  result: WordHuntResult,
  _stats: WordHuntStats
): WordHuntFact | null {
  if (!result.attempts || result.attempts.length === 0) return null;

  const firstAttempt = result.attempts[0];
  if (!firstAttempt.feedback || firstAttempt.feedback.length === 0) return null;

  const total = firstAttempt.feedback.length;
  const correct = firstAttempt.feedback.filter(
    (f) => f.feedback === 'green' || f.feedback === 'yellow'
  ).length;

  if (correct / total < LETTER_DETECTIVE_RATIO) return null;

  return {
    type: 'letterDetective',
    translationKey: 'wordHunt.facts.letterDetective',
    translationParams: { correct, total },
    icon: 'Search',
    color: 'neo-cyan',
    value: `${correct}/${total}`,
  };
}

/** #7: Streak of 7+ days */
export function getStreakLegendFact(
  result: WordHuntResult,
  _stats: WordHuntStats
): WordHuntFact | null {
  if (result.streakDays < STREAK_LEGEND_DAYS) return null;

  return {
    type: 'streakLegend',
    translationKey: 'wordHunt.facts.streakLegend',
    translationParams: { days: result.streakDays },
    icon: 'Flame',
    color: 'neo-orange',
    value: result.streakDays,
  };
}

/** #8: Solved with very little life remaining (≤ 15) */
export function getCloseCallFact(
  result: WordHuntResult,
  _stats: WordHuntStats
): WordHuntFact | null {
  if (!result.solved) return null;
  if (result.lifeRemaining == null) return null;
  if (result.lifeRemaining > CLOSE_CALL_LIFE_THRESHOLD) return null;

  return {
    type: 'closeCall',
    translationKey: 'wordHunt.facts.closeCall',
    translationParams: { life: Math.round(result.lifeRemaining) },
    icon: 'HeartPulse',
    color: 'neo-pink',
    value: Math.round(result.lifeRemaining),
  };
}

/** #9: Lots of life remaining (≥ 80) */
export function getLifeSaverFact(
  result: WordHuntResult,
  _stats: WordHuntStats
): WordHuntFact | null {
  if (!result.solved) return null;
  if (result.lifeRemaining == null || result.lifeRemaining < LIFE_SAVER_THRESHOLD) return null;

  return {
    type: 'lifeSaver',
    translationKey: 'wordHunt.facts.lifeSaver',
    translationParams: { life: Math.round(result.lifeRemaining) },
    icon: 'Heart',
    color: 'neo-lime',
    value: Math.round(result.lifeRemaining),
  };
}

/** #10: Found ≥ 5 survival words */
export function getWordExplorerFact(
  result: WordHuntResult,
  _stats: WordHuntStats
): WordHuntFact | null {
  if (!result.wordsDiscovered || result.wordsDiscovered.length < WORD_EXPLORER_MIN) return null;

  return {
    type: 'wordExplorer',
    translationKey: 'wordHunt.facts.wordExplorer',
    translationParams: { count: result.wordsDiscovered.length },
    icon: 'Compass',
    color: 'neo-cyan',
    value: result.wordsDiscovered.length,
  };
}

/** #11: Fewer guesses than average */
export function getFewerGuessesFact(
  result: WordHuntResult,
  stats: WordHuntStats
): WordHuntFact | null {
  if (!result.solved) return null;
  if (stats.avgAttemptsSolved == null) return null;
  if (result.attemptsUsed >= stats.avgAttemptsSolved) return null;

  return {
    type: 'fewerGuesses',
    translationKey: 'wordHunt.facts.fewerGuesses',
    translationParams: {
      attempts: result.attemptsUsed,
      avg: Math.round(stats.avgAttemptsSolved * 10) / 10,
    },
    icon: 'TrendingDown',
    color: 'neo-lime',
    value: result.attemptsUsed,
  };
}

/** #12: Target word is a palindrome */
export function getPalindromeFact(
  result: WordHuntResult,
  _stats: WordHuntStats
): WordHuntFact | null {
  const word = sanitizeWord(result.targetWord, result.language).toLowerCase();
  if (word.length < 2) return null;

  const reversed = word.split('').reverse().join('');
  if (word !== reversed) return null;

  return {
    type: 'palindrome',
    translationKey: 'wordHunt.facts.palindrome',
    translationParams: {},
    icon: 'RotateCcw',
    color: 'neo-yellow',
  };
}

/** #13: Target word contains rare letters (Q, X, Z, J) — English only */
export function getRareLetterFact(
  result: WordHuntResult,
  _stats: WordHuntStats
): WordHuntFact | null {
  if (result.language !== 'en') return null;

  const upper = result.targetWord.toUpperCase();
  const found = RARE_LETTERS.find((letter) => upper.includes(letter));
  if (!found) return null;

  return {
    type: 'rareLetter',
    translationKey: 'wordHunt.facts.rareLetter',
    translationParams: { letter: found },
    icon: 'Gem',
    color: 'neo-pink',
  };
}

/** #14: Target word is 7+ letters */
export function getLongWordFact(
  result: WordHuntResult,
  _stats: WordHuntStats
): WordHuntFact | null {
  if (result.targetWord.length < LONG_WORD_MIN_LENGTH) return null;

  return {
    type: 'longWord',
    translationKey: 'wordHunt.facts.longWord',
    translationParams: { length: result.targetWord.length },
    icon: 'Ruler',
    color: 'neo-orange',
  };
}

// ---------------------------------------------------------------------------
// Aggregator — returns top N facts in priority order
// ---------------------------------------------------------------------------

export function getWordHuntFacts(
  result: WordHuntResult,
  stats: WordHuntStats
): WordHuntFact[] {
  const generators = [
    getFirstTryFact,
    getSpeedSolverFact,
    getTopPerformerFact,
    getEliteClubFact,
    getEfficiencyMachineFact,
    getLetterDetectiveFact,
    getStreakLegendFact,
    getCloseCallFact,
    getLifeSaverFact,
    getWordExplorerFact,
    getFewerGuessesFact,
    getPalindromeFact,
    getRareLetterFact,
    getLongWordFact,
  ];

  const facts = generators
    .map((fn) => fn(result, stats))
    .filter((f): f is WordHuntFact => f !== null);

  return facts.slice(0, MAX_FACTS);
}
