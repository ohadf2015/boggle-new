import { describe, expect, it } from 'vitest';
import { roundHardestWords } from '../roundHardestWords';
import { FREE_PREVIEW_WORDS } from '@/lib/education/wordMasteryReport';
import type { ClassroomSummary } from '@/shared/types/classroom';

const summary = (over: Partial<ClassroomSummary>): ClassroomSummary =>
  ({
    totalWords: 6,
    classFoundCount: 2,
    missedWords: [],
    teacherName: 'Ms T',
    masteryByPlayer: { 'Ms T': { found: 6, total: 6 }, Noa: { found: 1, total: 6 }, Dan: { found: 2, total: 6 }, Lia: { found: 1, total: 6 } },
    ...over,
  }) as unknown as ClassroomSummary;

describe('roundHardestWords', () => {
  it('given coverage for the round, when picked, then the free number of fewest-found words comes back, hardest first', () => {
    const words = roundHardestWords(summary({
      coverage: [
        { word: 'apple', foundBy: ['Noa'] },
        { word: 'pear', foundBy: [] },
        { word: 'plum', foundBy: ['Ms T'] },
        { word: 'kiwi', foundBy: ['Noa', 'Dan', 'Lia'] },
        { word: 'fig', foundBy: [] },
      ],
    } as never));
    expect(words).toHaveLength(FREE_PREVIEW_WORDS);
    expect(words.map((w) => w.word)).toEqual(['pear', 'plum', 'fig']);
    expect(words[0]).toMatchObject({ found: 0, of: 3 });
  });

  it('given a word the board never carried, when picked, then it is not called hard', () => {
    const words = roundHardestWords(summary({ coverage: [{ word: 'ghost', foundBy: [] }, { word: 'pear', foundBy: [] }], neverPlacedWords: ['ghost'] } as never));
    expect(words.map((w) => w.word)).toEqual(['pear']);
  });

  it('given a summary saved before coverage existed, when picked, then missed words still show without counts breaking', () => {
    const words = roundHardestWords(summary({ coverage: undefined, missedWords: ['desk', 'lamp'] } as never));
    expect(words.map((w) => w.word)).toEqual(['desk', 'lamp']);
  });

  it('given a round with no students (only the host), when picked, then nothing is hard', () => {
    expect(roundHardestWords(summary({ masteryByPlayer: { 'Ms T': { found: 6, total: 6 } }, coverage: [{ word: 'pear', foundBy: [] }] } as never))).toEqual([]);
  });
});
