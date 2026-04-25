/**
 * P0-1 regression test: AdventureWheelGame must persist completion to DB
 * via ProgressionContext.completeLevel — otherwise stars/gold/XP are lost
 * on the 9 wheel-archetype levels (W2L5, W3L4, W4L2, W5L6, W6L5, W7L3,
 * W8L5, W9L1, W10L3).
 */
import React from 'react';
import { vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

const completeLevelMock = vi.fn().mockResolvedValue(true);

vi.mock('@/contexts/ProgressionContext', () => ({
  useProgressionActions: () => ({ completeLevel: completeLevelMock }),
  useProgressionData: () => ({ progression: { upgrades: {} } }),
  useProgression: () => ({
    progression: { upgrades: {}, chapterQuests: {} },
    updateChapterQuestProgress: vi.fn(),
  }),
}));

vi.mock('@/lib/adventure/questConfig', () => ({
  getQuestsForChapter: () => [],
  getChapterNumber: () => 1,
}));

vi.mock('@/hooks/useAdventureAchievements', () => ({
  useAdventureAchievements: () => ({
    earnAchievement: vi.fn().mockReturnValue(false),
    getCount: vi.fn().mockReturnValue(0),
  }),
}));

vi.mock('@/components/achievements/AchievementToast', () => ({
  showAchievementToast: vi.fn(),
}));

vi.mock('@/hooks/useAdventureMusic', () => ({
  useAdventureMusic: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: () => ({ id: 'p', letters: 'ABCDEFG', words: [] }),
}));

vi.mock('@/components/daily/WordWheelEffectsCanvas', () => ({
  WordWheelEffectsCanvas: () => null,
}));

let capturedOnComplete: ((r: any) => void) | null = null;
vi.mock('@/components/daily/WordWheelGame', () => ({
  __esModule: true,
  default: (props: any) => {
    capturedOnComplete = props.onComplete;
    return null;
  },
}));

import AdventureWheelGame from '../AdventureWheelGame';

const baseLevel: any = {
  world: 2, level: 5,
  objectives: [{ type: 'scoreTarget', target: 200 }],
  timerSeconds: 120,
};

describe('AdventureWheelGame — P0-1 persistence', () => {
  beforeEach(() => completeLevelMock.mockClear());

  it('calls ProgressionContext.completeLevel with stars/score/gold on game completion', async () => {
    const onLevelComplete = vi.fn();
    render(
      <AdventureWheelGame
        levelConfig={baseLevel}
        onLevelComplete={onLevelComplete}
        onExit={() => {}}
      />
    );

    expect(capturedOnComplete).toBeTruthy();
    capturedOnComplete!({ score: 250, wordsFound: ['HELLO', 'WORLDS'], timeSeconds: 47 });

    expect(completeLevelMock).toHaveBeenCalledTimes(1);
    const [world, level, stars, score, words, gold, longWords, wordsFound, flashChallengeGold, timePlayed] =
      completeLevelMock.mock.calls[0];
    expect(world).toBe(2);
    expect(level).toBe(5);
    expect(stars).toBe(3);
    expect(score).toBe(250);
    expect(words).toBe(2);
    expect(gold).toBeGreaterThan(0);
    expect(longWords).toBe(1);
    expect(wordsFound).toEqual(['HELLO', 'WORLDS']);
    expect(flashChallengeGold).toBeUndefined();
    expect(timePlayed).toBe(47);
    expect(onLevelComplete).toHaveBeenCalled();
  });
});
