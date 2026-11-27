import { describe, it, expect, vi } from 'vitest';

vi.mock('@/backend/modules/communityWordManager', () => ({
  isWordCommunityValid: () => false,
  isWordValidForScoring: () => false,
}));

import seedWords from '../seed-words.json';
import { invalidSeedWords } from '../seedWordCheck';

describe('seed word lists', () => {
  it('only lists words the English dictionary accepts', async () => {
    const all = [...Object.values(seedWords.byLength), ...Object.values(seedWords.byLetter)].flat() as string[];
    expect(all.length).toBeGreaterThan(300);
    expect(await invalidSeedWords(all)).toEqual([]);
  }, 60_000);

  it('keeps every letter a-z populated so no /starting-with/<letter> page goes empty', () => {
    for (const l of 'abcdefghijklmnopqrstuvwxyz') {
      expect(seedWords.byLetter[l as keyof typeof seedWords.byLetter]?.length ?? 0, l).toBeGreaterThanOrEqual(10);
    }
  });
});
