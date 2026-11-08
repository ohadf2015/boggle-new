import { describe, it, expect } from 'vitest';
import { calculateWordScore } from '@/shared/utils/scoring';
import { pickBestMissedWord } from '../bestMissedWord';

describe('pickBestMissedWord', () => {
  it('Given board words and found words, When picking, Then returns the highest-scoring word not found', () => {
    const best = pickBestMissedWord(['cat', 'stranger', 'range', 'tan'], ['cat', 'range'], 'en');
    expect(best).toEqual({ word: 'stranger', letters: 8, points: calculateWordScore('stranger') });
  });

  it('Given found words in a different case, When picking, Then they are not reported as missed', () => {
    expect(pickBestMissedWord(['STRANGER', 'cat'], ['stranger'], 'en')?.word).toBe('cat');
  });

  it('Given a Hebrew final-letter variant, When picking, Then the found form still counts as found', () => {
    expect(pickBestMissedWord(['שלום'], ['שלומ'], 'he')).toBeNull();
  });

  it('Given equal scores, When picking, Then the longer word wins, then alphabetical (deterministic)', () => {
    const a = pickBestMissedWord(['zebras', 'apples'], [], 'en');
    const b = pickBestMissedWord(['apples', 'zebras'], [], 'en');
    expect(a?.word).toBe('apples');
    expect(b?.word).toBe('apples');
  });

  it('Given every word found, When picking, Then returns null', () => {
    expect(pickBestMissedWord(['cat'], ['cat'], 'en')).toBeNull();
  });

  it('Given empty or junk candidates, When picking, Then ignores them', () => {
    expect(pickBestMissedWord(['', 'a', undefined as unknown as string], [], 'en')).toBeNull();
  });
});
