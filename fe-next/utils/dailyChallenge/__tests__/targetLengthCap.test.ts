import { describe, it, expect } from 'vitest';
import { MAX_TARGET_WORD_LENGTH } from '../constants';
import { WORD_LENGTH_RANGE } from '@/lib/dailyChallenge/wordBankData';
import { generateDailyPuzzle } from '../gridGeneration';
import type { Language } from '@/types';

describe('Word Hunt target length cap', () => {
  it('caps daily targets at 6 letters', () => {
    expect(MAX_TARGET_WORD_LENGTH).toBe(6);
  });

  it.each(['en', 'he', 'sv', 'es', 'ru'] as Language[])('word bank never admits %s targets above the cap', (lang) => {
    expect(WORD_LENGTH_RANGE[lang].max).toBe(MAX_TARGET_WORD_LENGTH);
  });

  it.each(['en', 'he', 'sv', 'es'] as Language[])('generated %s boards over 20 days keep targets at 6 or fewer', (lang) => {
    for (let d = 1; d <= 20; d++) {
      const date = `2026-12-${String(d).padStart(2, '0')}`;
      expect(generateDailyPuzzle(date, lang).targetWord.length).toBeLessThanOrEqual(6);
    }
  });
});

describe('Multiplayer Word Hunt target length cap', () => {
  it('matches the daily 6-letter cap', async () => {
    const { HUNT_TARGET_MAX_LENGTH } = await import('@/shared/constants/wordHuntMultiplayerConstants');
    expect(HUNT_TARGET_MAX_LENGTH).toBe(MAX_TARGET_WORD_LENGTH);
  });
});
