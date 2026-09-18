/**
 * Treasure Chest Resolver
 *
 * Pure, deterministic seeded outcomes for Gold-Quest-style chests in vocab quizzes.
 * Seed: `${gameCode}:${questionIndex}:${userId}`.
 *
 * Outcomes:
 * - gain: +5 to +15 points
 * - double: 2x the answer points
 * - steal: steal 5-15 points from the highest scorer
 * - swap: swap scores with the highest scorer
 * - small-loss: -5 to -10 points, floored at 0
 */

import type { QuizPlayer, VocabQuizSession } from './vocabQuizEngine';
import type { TreasureChestOutcome, TreasureChestState, VocabQuizStanding } from '@/shared/types/vocabQuiz';

/**
 * Simple seeded pseudorandom number generator. Converts seed string to
 * deterministic 0-1 value. Same seed always yields same result.
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash % 10000) / 10000;
}

/**
 * Deterministically resolve a chest outcome from a seed.
 * Returns one of: gain, double, steal, swap, small-loss
 */
export function resolveChestOutcome(seed: string): TreasureChestOutcome {
  const rand = seededRandom(seed);
  // 20% each
  if (rand < 0.2) return 'gain';
  if (rand < 0.4) return 'double';
  if (rand < 0.6) return 'steal';
  if (rand < 0.8) return 'swap';
  return 'small-loss';
}

export interface ResolveChestInput {
  gameCode: string;
  questionIndex: number;
  username: string;
  players: Map<string, QuizPlayer>;
  currentScore: number;
  baseCorrectedPoints: number;
}

/**
 * Resolve the full chest result: outcome, amount, standings update.
 * Modifies player scores in-place in the input map (for atomic consistency).
 */
export function resolveChestResult(input: ResolveChestInput): TreasureChestState {
  const { gameCode, questionIndex, username, players, currentScore, baseCorrectedPoints } = input;
  const seed = `${gameCode}:${questionIndex}:${username}`;
  const outcome = resolveChestOutcome(seed);

  const player = players.get(username);
  if (!player) {
    // Should never happen, but return a safe default
    return {
      actor: username,
      outcome: 'gain',
      amount: 0,
      standings: buildStandings(players),
    };
  }

  let amount = 0;
  let targetUsername: string | undefined;
  const amountRand = seededRandom(`${seed}:amount`);

  switch (outcome) {
    case 'gain': {
      // Gain 5-15 points
      amount = Math.floor(5 + amountRand * 10);
      player.score = currentScore + amount;
      break;
    }

    case 'double': {
      // Double the points earned on this question
      amount = baseCorrectedPoints * 2;
      player.score = currentScore + amount;
      break;
    }

    case 'steal': {
      // Steal from highest scorer (excluding self)
      const highest = findHighestScorer(players, username);
      if (highest) {
        targetUsername = highest.username;
        amount = Math.floor(5 + amountRand * 10);
        // Clamp stolen amount to what they actually have
        amount = Math.min(amount, highest.score);
        highest.score -= amount;
        player.score = currentScore + amount;
      }
      break;
    }

    case 'swap': {
      // Swap scores with highest scorer
      const highest = findHighestScorer(players, username);
      if (highest) {
        targetUsername = highest.username;
        amount = highest.score - currentScore; // Difference for display
        const temp = highest.score;
        highest.score = currentScore;
        player.score = temp;
      }
      break;
    }

    case 'small-loss': {
      // Lose 5-10 points, floor at 0
      amount = -(Math.floor(5 + amountRand * 5));
      player.score = Math.max(0, currentScore + amount);
      break;
    }
  }

  return {
    actor: username,
    outcome,
    amount,
    targetUsername,
    standings: buildStandings(players),
  };
}

/**
 * Find the highest-scoring player other than the given username.
 */
function findHighestScorer(players: Map<string, QuizPlayer>, excludeUsername: string): QuizPlayer | null {
  let highest: QuizPlayer | null = null;
  for (const player of players.values()) {
    if (player.username === excludeUsername) continue;
    if (!highest || player.score > highest.score) {
      highest = player;
    }
  }
  return highest;
}

/**
 * Build a VocabQuizStanding array from players, sorted by score descending.
 */
function buildStandings(players: Map<string, QuizPlayer>): VocabQuizStanding[] {
  return Array.from(players.values())
    .map((p) => ({
      username: p.username,
      score: p.score,
      streak: p.streak,
      bestStreak: p.bestStreak,
      correctCount: p.correctCount,
    }))
    .sort((a, b) => b.score - a.score);
}
