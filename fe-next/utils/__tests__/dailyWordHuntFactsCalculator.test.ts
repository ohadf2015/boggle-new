/**
 * Tests for Daily Word Hunt Facts Calculator
 *
 * TDD: RED phase — these tests define the expected behavior
 * for all 14 fact generators + the aggregator.
 */

import type { WordHuntResult } from '@/utils/dailyChallenge';
import type { WordHuntStats } from '@/components/daily/results/types';
import {
  type WordHuntFact,
  type WordHuntFactType,
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
  getWordHuntFacts,
} from '../dailyWordHuntFactsCalculator';

// ---------------------------------------------------------------------------
// Helpers — build minimal result/stats objects
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<WordHuntResult> = {}): WordHuntResult {
  return {
    puzzleNumber: 1,
    puzzleDate: '2026-03-03',
    language: 'en',
    solved: true,
    attemptsUsed: 3,
    targetWord: 'CRANE',
    attempts: [
      { word: 'SLATE', feedback: [{ letter: 'S', feedback: 'gray', position: 0 }, { letter: 'L', feedback: 'gray', position: 1 }, { letter: 'A', feedback: 'yellow', position: 2 }, { letter: 'T', feedback: 'gray', position: 3 }, { letter: 'E', feedback: 'green', position: 4 }], timestamp: 1000 },
      { word: 'BRAIN', feedback: [{ letter: 'B', feedback: 'gray', position: 0 }, { letter: 'R', feedback: 'green', position: 1 }, { letter: 'A', feedback: 'green', position: 2 }, { letter: 'I', feedback: 'gray', position: 3 }, { letter: 'N', feedback: 'green', position: 4 }], timestamp: 2000 },
      { word: 'CRANE', feedback: [{ letter: 'C', feedback: 'green', position: 0 }, { letter: 'R', feedback: 'green', position: 1 }, { letter: 'A', feedback: 'green', position: 2 }, { letter: 'N', feedback: 'green', position: 3 }, { letter: 'E', feedback: 'green', position: 4 }], timestamp: 3000 },
    ],
    streakDays: 3,
    completedAt: '2026-03-03T12:00:00Z',
    ...overrides,
  };
}

function makeStats(overrides: Partial<WordHuntStats> = {}): WordHuntStats {
  return {
    totalPlayers: 500,
    solvedCount: 300,
    solveRate: 60,
    attemptDistribution: { '1': 20, '2': 50, '3': 80, '4': 60, '5': 40 },
    avgAttemptsSolved: 3.5,
    yourStats: {
      solved: true,
      attemptsUsed: 3,
      percentile: 25,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Individual fact generator tests
// ---------------------------------------------------------------------------

describe('dailyWordHuntFactsCalculator', () => {
  describe('getFirstTryFact', () => {
    it('returns fact when solved in 1 attempt', () => {
      const result = makeResult({ attemptsUsed: 1 });
      const stats = makeStats({ solveRate: 15 });
      const fact = getFirstTryFact(result, stats);
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('firstTry');
      expect(fact!.translationParams.solveRate).toBeDefined();
    });

    it('returns null when more than 1 attempt', () => {
      const result = makeResult({ attemptsUsed: 2 });
      const stats = makeStats();
      expect(getFirstTryFact(result, stats)).toBeNull();
    });

    it('returns null when not solved', () => {
      const result = makeResult({ solved: false, attemptsUsed: 1 });
      const stats = makeStats();
      expect(getFirstTryFact(result, stats)).toBeNull();
    });
  });

  describe('getSpeedSolverFact', () => {
    it('returns fact when solved in under 90 seconds', () => {
      const start = Date.now();
      const result = makeResult({
        attempts: [
          { word: 'CRANE', feedback: [{ letter: 'C', feedback: 'green', position: 0 }, { letter: 'R', feedback: 'green', position: 1 }, { letter: 'A', feedback: 'green', position: 2 }, { letter: 'N', feedback: 'green', position: 3 }, { letter: 'E', feedback: 'green', position: 4 }], timestamp: start + 45000 },
        ],
        attemptsUsed: 1,
        completedAt: new Date(start + 45000).toISOString(),
      });
      // We need first and last attempt timestamps to compute duration
      const fact = getSpeedSolverFact(result, makeStats());
      // If only 1 attempt, we can't reliably compute speed — depends on implementation
      // With multiple attempts:
      const result2 = makeResult({
        attempts: [
          { word: 'SLATE', feedback: [], timestamp: start },
          { word: 'CRANE', feedback: [], timestamp: start + 60000 },
        ],
        attemptsUsed: 2,
      });
      const fact2 = getSpeedSolverFact(result2, makeStats());
      expect(fact2).not.toBeNull();
      expect(fact2!.type).toBe('speedSolver');
      expect(fact2!.translationParams.seconds).toBeLessThanOrEqual(90);
    });

    it('returns null when solving took over 90 seconds', () => {
      const start = Date.now();
      const result = makeResult({
        attempts: [
          { word: 'SLATE', feedback: [], timestamp: start },
          { word: 'CRANE', feedback: [], timestamp: start + 120000 },
        ],
        attemptsUsed: 2,
      });
      expect(getSpeedSolverFact(result, makeStats())).toBeNull();
    });

    it('returns null when not solved', () => {
      const start = Date.now();
      const result = makeResult({
        solved: false,
        attempts: [
          { word: 'SLATE', feedback: [], timestamp: start },
          { word: 'BRAIN', feedback: [], timestamp: start + 30000 },
        ],
      });
      expect(getSpeedSolverFact(result, makeStats())).toBeNull();
    });
  });

  describe('getTopPerformerFact', () => {
    it('returns fact when percentile ≤ 10', () => {
      const stats = makeStats({ yourStats: { solved: true, attemptsUsed: 1, percentile: 5 }, totalPlayers: 1000 });
      const fact = getTopPerformerFact(makeResult(), stats);
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('topPerformer');
      expect(fact!.translationParams.percentile).toBe(5);
    });

    it('returns null when percentile > 10', () => {
      const stats = makeStats({ yourStats: { solved: true, attemptsUsed: 3, percentile: 25 } });
      expect(getTopPerformerFact(makeResult(), stats)).toBeNull();
    });

    it('returns null when no yourStats', () => {
      const stats = makeStats({ yourStats: undefined });
      expect(getTopPerformerFact(makeResult(), stats)).toBeNull();
    });
  });

  describe('getEliteClubFact', () => {
    it('returns fact when solveRate < 30% and player solved', () => {
      const stats = makeStats({ solveRate: 20 });
      const fact = getEliteClubFact(makeResult({ solved: true }), stats);
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('eliteClub');
      expect(fact!.translationParams.solveRate).toBe(20);
    });

    it('returns null when solveRate ≥ 30%', () => {
      const stats = makeStats({ solveRate: 60 });
      expect(getEliteClubFact(makeResult(), stats)).toBeNull();
    });

    it('returns null when not solved', () => {
      const stats = makeStats({ solveRate: 15 });
      expect(getEliteClubFact(makeResult({ solved: false }), stats)).toBeNull();
    });
  });

  describe('getEfficiencyMachineFact', () => {
    it('returns fact when efficiency ≥ 80', () => {
      const result = makeResult({ efficiencyScore: 92 });
      const fact = getEfficiencyMachineFact(result, makeStats());
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('efficiencyMachine');
      expect(fact!.translationParams.score).toBe(92);
    });

    it('returns null when efficiency < 80', () => {
      const result = makeResult({ efficiencyScore: 65 });
      expect(getEfficiencyMachineFact(result, makeStats())).toBeNull();
    });

    it('returns null when no efficiency score', () => {
      const result = makeResult({ efficiencyScore: undefined });
      expect(getEfficiencyMachineFact(result, makeStats())).toBeNull();
    });
  });

  describe('getLetterDetectiveFact', () => {
    it('returns fact when first guess has ≥ 50% correct letters', () => {
      // Target: CRANE, First guess has 3/5 green/yellow = 60%
      const result = makeResult({
        targetWord: 'CRANE',
        attempts: [
          {
            word: 'CRAVE',
            feedback: [
              { letter: 'C', feedback: 'green', position: 0 },
              { letter: 'R', feedback: 'green', position: 1 },
              { letter: 'A', feedback: 'green', position: 2 },
              { letter: 'V', feedback: 'gray', position: 3 },
              { letter: 'E', feedback: 'green', position: 4 },
            ],
            timestamp: 1000,
          },
        ],
      });
      const fact = getLetterDetectiveFact(result, makeStats());
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('letterDetective');
      expect(fact!.translationParams.correct).toBeGreaterThanOrEqual(3);
    });

    it('returns null when first guess has < 50% correct', () => {
      const result = makeResult({
        targetWord: 'CRANE',
        attempts: [
          {
            word: 'GIDDY',
            feedback: [
              { letter: 'G', feedback: 'gray', position: 0 },
              { letter: 'I', feedback: 'gray', position: 1 },
              { letter: 'D', feedback: 'gray', position: 2 },
              { letter: 'D', feedback: 'gray', position: 3 },
              { letter: 'Y', feedback: 'gray', position: 4 },
            ],
            timestamp: 1000,
          },
        ],
      });
      expect(getLetterDetectiveFact(result, makeStats())).toBeNull();
    });

    it('returns null when no attempts', () => {
      const result = makeResult({ attempts: [] });
      expect(getLetterDetectiveFact(result, makeStats())).toBeNull();
    });
  });

  describe('getStreakLegendFact', () => {
    it('returns fact when streak ≥ 7', () => {
      const fact = getStreakLegendFact(makeResult({ streakDays: 14 }), makeStats());
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('streakLegend');
      expect(fact!.translationParams.days).toBe(14);
    });

    it('returns null when streak < 7', () => {
      expect(getStreakLegendFact(makeResult({ streakDays: 3 }), makeStats())).toBeNull();
    });
  });

  describe('getCloseCallFact', () => {
    it('returns fact when solved with life ≤ 15', () => {
      const result = makeResult({ solved: true, lifeRemaining: 10 });
      const fact = getCloseCallFact(result, makeStats());
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('closeCall');
      expect(fact!.translationParams.life).toBe(10);
    });

    it('returns null when life > 15', () => {
      const result = makeResult({ solved: true, lifeRemaining: 50 });
      expect(getCloseCallFact(result, makeStats())).toBeNull();
    });

    it('returns null when not solved', () => {
      const result = makeResult({ solved: false, lifeRemaining: 5 });
      expect(getCloseCallFact(result, makeStats())).toBeNull();
    });

    it('returns null when lifeRemaining is undefined', () => {
      const result = makeResult({ solved: true, lifeRemaining: undefined });
      expect(getCloseCallFact(result, makeStats())).toBeNull();
    });

    it('rounds floating-point life values', () => {
      const result = makeResult({ solved: true, lifeRemaining: 7.400000000000001 });
      const fact = getCloseCallFact(result, makeStats());
      expect(fact).not.toBeNull();
      expect(fact!.translationParams.life).toBe(7);
      expect(fact!.value).toBe(7);
    });
  });

  describe('getLifeSaverFact', () => {
    it('returns fact when life ≥ 80 remaining', () => {
      const result = makeResult({ solved: true, lifeRemaining: 85 });
      const fact = getLifeSaverFact(result, makeStats());
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('lifeSaver');
      expect(fact!.translationParams.life).toBe(85);
    });

    it('returns null when life < 80', () => {
      const result = makeResult({ solved: true, lifeRemaining: 50 });
      expect(getLifeSaverFact(result, makeStats())).toBeNull();
    });

    it('returns null when not solved', () => {
      const result = makeResult({ solved: false, lifeRemaining: 90 });
      expect(getLifeSaverFact(result, makeStats())).toBeNull();
    });

    it('rounds floating-point life values', () => {
      const result = makeResult({ solved: true, lifeRemaining: 82.59999999999992 });
      const fact = getLifeSaverFact(result, makeStats());
      expect(fact).not.toBeNull();
      expect(fact!.translationParams.life).toBe(83);
      expect(fact!.value).toBe(83);
    });
  });

  describe('getWordExplorerFact', () => {
    it('returns fact when ≥ 5 words discovered', () => {
      const words = Array.from({ length: 6 }, (_, i) => ({
        word: `WORD${i}`,
        timestamp: 1000 + i * 100,
        lifeGained: 5,
        tokensGained: 1,
      }));
      const result = makeResult({ wordsDiscovered: words });
      const fact = getWordExplorerFact(result, makeStats());
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('wordExplorer');
      expect(fact!.translationParams.count).toBe(6);
    });

    it('returns null when < 5 words discovered', () => {
      const words = Array.from({ length: 3 }, (_, i) => ({
        word: `WORD${i}`,
        timestamp: 1000,
        lifeGained: 5,
        tokensGained: 1,
      }));
      const result = makeResult({ wordsDiscovered: words });
      expect(getWordExplorerFact(result, makeStats())).toBeNull();
    });

    it('returns null when no wordsDiscovered', () => {
      const result = makeResult({ wordsDiscovered: undefined });
      expect(getWordExplorerFact(result, makeStats())).toBeNull();
    });
  });

  describe('getFewerGuessesFact', () => {
    it('returns fact when attempts < average and solved', () => {
      const result = makeResult({ solved: true, attemptsUsed: 2 });
      const stats = makeStats({ avgAttemptsSolved: 4.5 });
      const fact = getFewerGuessesFact(result, stats);
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('fewerGuesses');
      expect(fact!.translationParams.attempts).toBe(2);
    });

    it('returns null when attempts ≥ average', () => {
      const result = makeResult({ solved: true, attemptsUsed: 5 });
      const stats = makeStats({ avgAttemptsSolved: 4.5 });
      expect(getFewerGuessesFact(result, stats)).toBeNull();
    });

    it('returns null when not solved', () => {
      const result = makeResult({ solved: false, attemptsUsed: 2 });
      const stats = makeStats({ avgAttemptsSolved: 4.5 });
      expect(getFewerGuessesFact(result, stats)).toBeNull();
    });

    it('returns null when avgAttemptsSolved is null', () => {
      const result = makeResult({ solved: true, attemptsUsed: 2 });
      const stats = makeStats({ avgAttemptsSolved: null });
      expect(getFewerGuessesFact(result, stats)).toBeNull();
    });
  });

  describe('getPalindromeFact', () => {
    it('returns fact for palindrome target word', () => {
      const result = makeResult({ targetWord: 'KAYAK' });
      const fact = getPalindromeFact(result, makeStats());
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('palindrome');
    });

    it('returns fact for Hebrew palindrome', () => {
      const result = makeResult({ targetWord: 'אבא', language: 'he' });
      const fact = getPalindromeFact(result, makeStats());
      expect(fact).not.toBeNull();
    });

    it('returns null for non-palindrome', () => {
      const result = makeResult({ targetWord: 'CRANE' });
      expect(getPalindromeFact(result, makeStats())).toBeNull();
    });
  });

  describe('getRareLetterFact', () => {
    it('returns fact when target has Q', () => {
      const result = makeResult({ targetWord: 'QUEEN' });
      const fact = getRareLetterFact(result, makeStats());
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('rareLetter');
      expect(fact!.translationParams.letter).toBe('Q');
    });

    it('returns fact when target has X', () => {
      const result = makeResult({ targetWord: 'EXTRA' });
      const fact = getRareLetterFact(result, makeStats());
      expect(fact).not.toBeNull();
      expect(fact!.translationParams.letter).toBe('X');
    });

    it('returns fact when target has Z', () => {
      const result = makeResult({ targetWord: 'FUZZY' });
      const fact = getRareLetterFact(result, makeStats());
      expect(fact).not.toBeNull();
    });

    it('returns fact when target has J', () => {
      const result = makeResult({ targetWord: 'JOKER' });
      const fact = getRareLetterFact(result, makeStats());
      expect(fact).not.toBeNull();
    });

    it('returns null for common letters only', () => {
      const result = makeResult({ targetWord: 'CRANE' });
      expect(getRareLetterFact(result, makeStats())).toBeNull();
    });

    it('only triggers for English language', () => {
      const result = makeResult({ targetWord: 'QUEEN', language: 'he' });
      expect(getRareLetterFact(result, makeStats())).toBeNull();
    });
  });

  describe('getLongWordFact', () => {
    it('returns fact when target ≥ 7 letters', () => {
      const result = makeResult({ targetWord: 'ELEPHANT' });
      const fact = getLongWordFact(result, makeStats());
      expect(fact).not.toBeNull();
      expect(fact!.type).toBe('longWord');
      expect(fact!.translationParams.length).toBe(8);
    });

    it('returns null when target < 7 letters', () => {
      const result = makeResult({ targetWord: 'CRANE' });
      expect(getLongWordFact(result, makeStats())).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Aggregator
  // ---------------------------------------------------------------------------

  describe('getWordHuntFacts', () => {
    it('returns up to 4 facts', () => {
      const result = makeResult({
        solved: true,
        attemptsUsed: 1,
        efficiencyScore: 95,
        streakDays: 14,
        targetWord: 'ELEPHANT',
      });
      const stats = makeStats({ solveRate: 15, yourStats: { solved: true, attemptsUsed: 1, percentile: 3 } });
      const facts = getWordHuntFacts(result, stats);
      expect(facts.length).toBeLessThanOrEqual(4);
      expect(facts.length).toBeGreaterThan(0);
    });

    it('returns empty array when no facts apply', () => {
      const result = makeResult({
        solved: false,
        attemptsUsed: 10,
        targetWord: 'CAT',
        streakDays: 0,
        lifeRemaining: undefined,
        wordsDiscovered: undefined,
        efficiencyScore: undefined,
        attempts: [],
      });
      const stats = makeStats({
        solveRate: 80,
        avgAttemptsSolved: null,
        yourStats: undefined,
      });
      const facts = getWordHuntFacts(result, stats);
      expect(facts).toEqual([]);
    });

    it('each fact has required fields', () => {
      const result = makeResult({ solved: true, attemptsUsed: 1, efficiencyScore: 95 });
      const stats = makeStats({ solveRate: 10 });
      const facts = getWordHuntFacts(result, stats);
      for (const fact of facts) {
        expect(fact.type).toBeDefined();
        expect(fact.translationKey).toBeDefined();
        expect(fact.translationParams).toBeDefined();
        expect(fact.icon).toBeDefined();
        expect(fact.color).toBeDefined();
      }
    });

    it('prioritizes performance facts over word facts', () => {
      const result = makeResult({
        solved: true,
        attemptsUsed: 1,
        efficiencyScore: 95,
        streakDays: 14,
        targetWord: 'JAZZIEST', // rare letter + long word
      });
      const stats = makeStats({
        solveRate: 10,
        yourStats: { solved: true, attemptsUsed: 1, percentile: 3 },
      });
      const facts = getWordHuntFacts(result, stats);
      // firstTry, topPerformer, eliteClub, efficiencyMachine should come before rareLetter/longWord
      const types = facts.map(f => f.type);
      expect(types[0]).toBe('firstTry');
    });
  });

  // ---------------------------------------------------------------------------
  // Type safety
  // ---------------------------------------------------------------------------

  describe('WordHuntFact type', () => {
    it('has valid color values', () => {
      const validColors = ['neo-lime', 'neo-cyan', 'neo-orange', 'neo-pink', 'neo-yellow'];
      const result = makeResult({ solved: true, attemptsUsed: 1, efficiencyScore: 95 });
      const stats = makeStats({ solveRate: 10 });
      const facts = getWordHuntFacts(result, stats);
      for (const fact of facts) {
        expect(validColors).toContain(fact.color);
      }
    });
  });
});
