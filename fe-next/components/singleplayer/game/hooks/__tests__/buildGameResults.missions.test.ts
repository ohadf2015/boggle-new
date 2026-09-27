import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackGameEnd: vi.fn(),
  trackGameStart: vi.fn(),
}));

import { buildFallbackResults, buildGameResults } from '../buildGameResults';
import type { BotOpponent } from '../../../SinglePlayerView';

const bots: BotOpponent[] = [
  { id: 'b', name: 'B', difficulty: 'easy', score: 0, wordsFound: [] },
];

const base = {
  foundWords: [
    { word: 'planet', score: 20, timestamp: 1, timeSinceStart: 2, isValid: true as boolean | null },
  ],
  grid: [['A', 'B'], ['C', 'D']],
  bots,
  botScores: { b: 5 },
  botWords: { b: [] as string[] },
  gameStartTime: 0,
  timerSeconds: 60,
  maxCombo: 1,
  mode: 'solo-bots',
  language: 'en' as const,
};

describe('buildGameResults mission bonus', () => {
  it('adds mission bonus on top of word scores and records how many missions finished', () => {
    const results = buildGameResults({ ...base, missionBonusPts: 40, missionsCompleted: 2 });
    expect(results.playerScore).toBe(60);
    expect(results.missionsCompleted).toBe(2);
    expect(results.missionBonusPts).toBe(40);
  });

  it('leaves the score untouched when no mission fields are passed', () => {
    const results = buildGameResults(base);
    expect(results.playerScore).toBe(20);
    expect(results.missionsCompleted).toBeUndefined();
  });

  it('adds the same bonus on the fallback path', () => {
    const results = buildFallbackResults({ ...base, missionBonusPts: 30, missionsCompleted: 1 });
    expect(results.playerScore).toBe(50);
    expect(results.missionsCompleted).toBe(1);
  });
});
