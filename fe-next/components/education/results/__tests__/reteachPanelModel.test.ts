import { describe, it, expect } from 'vitest';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { reteachPanelWords } from '../reteachPanelModel';

const base = {
  teacherName: 'Ms K',
  lessonNames: ['Weather'],
  lessonIds: ['l1'],
  podium: [],
} as const;

function summary(coverage: Array<{ word: string; foundBy: string[] }>, students: string[]): ClassroomSummary {
  return {
    ...base,
    totalWords: coverage.length,
    coverage,
    missedWords: coverage.filter((c) => c.foundBy.length === 0).map((c) => c.word),
    classFoundCount: coverage.filter((c) => c.foundBy.length > 0).length,
    masteryByPlayer: Object.fromEntries(students.map((s) => [s, { found: 1, total: coverage.length }])),
  } as unknown as ClassroomSummary;
}

describe('reteachPanelWords', () => {
  it('given words fewer than half the class found, then those are the words to practice, fewest finders first', () => {
    const s = summary(
      [
        { word: 'rain', foundBy: ['Noa', 'Ido', 'Lia'] },
        { word: 'storm', foundBy: ['Noa'] },
        { word: 'fog', foundBy: [] },
      ],
      ['Noa', 'Ido', 'Lia']
    );
    expect(reteachPanelWords(s).map((w) => w.word)).toEqual(['fog', 'storm']);
  });

  it('given every word was found by under half the class but some by nobody, then the words nobody found are the ones to practice', () => {
    const s = summary(
      [
        { word: 'rain', foundBy: ['Noa'] },
        { word: 'storm', foundBy: ['Ido'] },
        { word: 'fog', foundBy: [] },
        { word: 'hail', foundBy: [] },
      ],
      ['Noa', 'Ido', 'Lia']
    );
    expect(reteachPanelWords(s).map((w) => w.word)).toEqual(['fog', 'hail']);
  });

  it('given nobody found any word, then nothing is offered: the whole lesson again is Play again', () => {
    const s = summary(
      [
        { word: 'rain', foundBy: [] },
        { word: 'fog', foundBy: [] },
      ],
      ['Noa', 'Ido']
    );
    expect(reteachPanelWords(s)).toEqual([]);
  });

  it('given the class found every word, then there is nothing to practice', () => {
    const s = summary([{ word: 'rain', foundBy: ['Noa', 'Ido'] }], ['Noa', 'Ido']);
    expect(reteachPanelWords(s)).toEqual([]);
  });

  it('given a round with no lesson words, then there is nothing to practice', () => {
    expect(reteachPanelWords(summary([], ['Noa']))).toEqual([]);
  });
});
