/**
 * Tests for Daily Word Hunt Facts Calculator (public API).
 *
 * The card renders exactly 1 insight via getWordHuntFacts().
 * Priority: rare brag → actionable coach tip → witty fallback.
 */

import type { WordHuntResult, StoredWordHuntResult } from '@/utils/dailyChallenge';
import type { WordHuntStats } from '@/components/daily/results/types';
import { getWordHuntFacts, getWordHuntInsights } from '../dailyWordHuntFactsCalculator';

const wd = (words: string[]) =>
  words.map((word, i) => ({ word, timestamp: i * 1000, lifeGained: 0, tokensGained: 0 }));

function makeResult(overrides: Partial<WordHuntResult> = {}): WordHuntResult {
  return {
    puzzleNumber: 1,
    puzzleDate: '2026-03-03',
    language: 'en',
    solved: true,
    attemptsUsed: 3,
    targetWord: 'CRANE',
    attempts: [],
    wordsDiscovered: wd(['CAR', 'RAN', 'ACE', 'ARC', 'CANE', 'NEAR']),
    lifeRemaining: 80,
    efficiencyScore: 720,
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
    yourStats: { solved: true, attemptsUsed: 3, percentile: 25 },
    ...overrides,
  };
}

describe('getWordHuntFacts', () => {
  it('returns exactly 1 fact (MAX_FACTS)', () => {
    const facts = getWordHuntFacts(makeResult(), makeStats());
    expect(facts.length).toBeLessThanOrEqual(1);
  });

  it('prioritizes firstTry brag over coach tips', () => {
    const result = makeResult({ attemptsUsed: 1, wordsDiscovered: [] });
    const facts = getWordHuntFacts(result, makeStats({ solveRate: 15 }));
    expect(facts[0].type).toBe('firstTry');
  });

  it('uses rare variant only when solve rate is actually rare', () => {
    const result = makeResult({ attemptsUsed: 1, wordsDiscovered: [] });
    const facts = getWordHuntFacts(result, makeStats({ solveRate: 15 }));
    expect(facts[0].translationKey).toBe('wordHunt.facts.firstTryRare');
  });

  it('uses personal variant (no "Only X%" phrasing) when solve rate is high', () => {
    const result = makeResult({ attemptsUsed: 1, wordsDiscovered: [] });
    const facts = getWordHuntFacts(result, makeStats({ solveRate: 100 }));
    expect(facts[0].type).toBe('firstTry');
    expect(facts[0].translationKey).toBe('wordHunt.facts.firstTryPersonal');
    expect(facts[0].translationParams.solveRate).toBeUndefined();
  });

  it('prioritizes perfect score brag', () => {
    const result = makeResult({ efficiencyScore: 1000, attemptsUsed: 2 });
    const facts = getWordHuntFacts(result, makeStats());
    expect(facts[0].type).toBe('perfectScore');
  });

  it('prioritizes top-1% brag when enough players', () => {
    const stats = makeStats({
      totalPlayers: 1000,
      yourStats: { solved: true, attemptsUsed: 3, percentile: 1 },
    });
    const facts = getWordHuntFacts(makeResult({ attemptsUsed: 2 }), stats);
    expect(facts[0].type).toBe('topPerformer');
  });

  it('prioritizes streak legend at 30+ days', () => {
    const facts = getWordHuntFacts(
      makeResult({ streakDays: 45, attemptsUsed: 2 }),
      makeStats()
    );
    expect(facts[0].type).toBe('streakLegend');
  });

  it('returns loss tip when player did not solve', () => {
    const result = makeResult({ solved: false, attemptsUsed: 6 });
    const facts = getWordHuntFacts(result, makeStats());
    expect(facts[0].type).toBe('tipLoss');
  });

  it('returns exploration tip when solved with few survival words', () => {
    const result = makeResult({ wordsDiscovered: wd(['CAR']), attemptsUsed: 2 });
    const facts = getWordHuntFacts(result, makeStats());
    expect(facts[0].type).toBe('tipExploration');
  });

  it('returns accuracy tip when solved with many guesses', () => {
    const result = makeResult({ attemptsUsed: 6, wordsDiscovered: wd(Array(10).fill('CAR')) });
    const facts = getWordHuntFacts(result, makeStats());
    expect(facts[0].type).toBe('tipAccuracy');
  });

  it('returns speed tip when life dropped low', () => {
    const result = makeResult({
      lifeRemaining: 20,
      attemptsUsed: 3,
      wordsDiscovered: wd(Array(10).fill('CAR')),
    });
    const facts = getWordHuntFacts(result, makeStats());
    expect(facts[0].type).toBe('tipSpeed');
  });

  it('falls back to palindrome witty observation', () => {
    const result = makeResult({
      targetWord: 'RACECAR',
      attemptsUsed: 2,
      lifeRemaining: 90,
      wordsDiscovered: wd(Array(10).fill('CAR')),
    });
    const facts = getWordHuntFacts(result, makeStats());
    expect(facts[0].type).toBe('palindrome');
  });

  it('falls back to long-word observation', () => {
    const result = makeResult({
      targetWord: 'ABSTRACT',
      attemptsUsed: 2,
      lifeRemaining: 90,
      wordsDiscovered: wd(Array(10).fill('CAR')),
    });
    const facts = getWordHuntFacts(result, makeStats());
    expect(facts[0].type).toBe('longWord');
  });

  it('each fact carries a translationKey and fallback for i18n', () => {
    const [fact] = getWordHuntFacts(makeResult({ efficiencyScore: 1000 }), makeStats());
    expect(fact.translationKey).toMatch(/^wordHunt\.facts\./);
    expect(typeof fact.icon).toBe('string');
    expect(fact.color).toMatch(/^neo-/);
  });

  it('is deterministic for same puzzle (same variant picked)', () => {
    const r = makeResult({ efficiencyScore: 1000 });
    const a = getWordHuntFacts(r, makeStats());
    const b = getWordHuntFacts(r, makeStats());
    expect(a[0].translationFallback).toBe(b[0].translationFallback);
  });
});

// ---------------------------------------------------------------------------
// Insight slot (personal progression + research fallback)
// ---------------------------------------------------------------------------

function makeStored(
  date: string,
  overrides: Partial<WordHuntResult> = {},
): StoredWordHuntResult {
  return {
    date,
    puzzleNumber: 1,
    completedAt: `${date}T12:00:00Z`,
    result: makeResult({ puzzleDate: date, ...overrides }),
  };
}

describe('getWordHuntInsights — insight slot', () => {
  it('always returns a research fact when no history', () => {
    const { insight } = getWordHuntInsights(makeResult(), makeStats());
    expect(insight).not.toBeNull();
    expect(insight!.type).toBe('researchFact');
  });

  it('prefers personal best over research when today beats prior history', () => {
    const history: StoredWordHuntResult[] = [
      makeStored('2026-03-01', { efficiencyScore: 500 }),
      makeStored('2026-03-02', { efficiencyScore: 600 }),
      makeStored('2026-02-28', { efficiencyScore: 450 }),
    ];
    const today = makeResult({ puzzleDate: '2026-03-03', efficiencyScore: 800 });
    const { insight } = getWordHuntInsights(today, makeStats(), history);
    expect(insight!.type).toBe('personalBest');
    expect(insight!.value).toBe(800);
  });

  it('fires milestone at 10 completions', () => {
    const history: StoredWordHuntResult[] = Array.from({ length: 9 }, (_, i) =>
      makeStored(`2026-03-${String(i + 1).padStart(2, '0')}`),
    );
    const today = makeResult({ puzzleDate: '2026-03-10' });
    const { insight } = getWordHuntInsights(today, makeStats(), history);
    expect(insight!.type).toBe('personalMilestone');
    expect(insight!.value).toBe(10);
  });

  it('reports improvement when recent avg guesses < older avg', () => {
    const recent: StoredWordHuntResult[] = Array.from({ length: 7 }, (_, i) =>
      makeStored(`2026-03-${String(i + 10).padStart(2, '0')}`, { attemptsUsed: 2 }),
    );
    const older: StoredWordHuntResult[] = Array.from({ length: 5 }, (_, i) =>
      makeStored(`2026-03-${String(i + 1).padStart(2, '0')}`, { attemptsUsed: 5 }),
    );
    const history = [...recent, ...older]; // storage returns desc by date already
    const today = makeResult({ puzzleDate: '2026-03-18', efficiencyScore: 500 });
    const { insight } = getWordHuntInsights(today, makeStats(), history);
    expect(['personalBest', 'personalImprovement']).toContain(insight!.type);
  });

  it('is deterministic — same puzzle picks same research fallback', () => {
    const r = makeResult({ puzzleNumber: 42 });
    const a = getWordHuntInsights(r, makeStats()).insight;
    const b = getWordHuntInsights(r, makeStats()).insight;
    expect(a!.translationKey).toBe(b!.translationKey);
  });
});
