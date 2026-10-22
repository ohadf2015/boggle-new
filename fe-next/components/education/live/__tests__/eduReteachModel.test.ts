import { describe, it, expect } from 'vitest';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { mostMissedWords, reteachList, studentsUnderHalf } from '@/components/education/live/eduReteachModel';

const mastery = (rows: Record<string, [number, number]>) =>
  Object.fromEntries(Object.entries(rows).map(([name, [found, total]]) => [name, { found, total }]));

function summaryOf(over: Partial<ClassroomSummary>): ClassroomSummary {
  return {
    teacherName: 'Ms K',
    lessonNames: ['Cells'],
    lessonIds: ['l1'],
    totalWords: 4,
    coverage: [],
    missedWords: [],
    classFoundCount: 0,
    masteryByPlayer: {},
    ...over,
  } as ClassroomSummary;
}

describe('mostMissedWords', () => {
  const fourStudents = mastery({ Ada: [3, 4], Ben: [1, 4], Cy: [2, 4], Dee: [0, 4] });

  it('given a class of four, when a word was found by under half of them, then it is most-missed, fewest finders first', () => {
    const summary = summaryOf({
      masteryByPlayer: fourStudents,
      coverage: [
        { word: 'osmosis', foundBy: ['Ada', 'Ben', 'Cy'] },
        { word: 'enzyme', foundBy: ['Ada'] },
        { word: 'membrane', foundBy: [] },
        { word: 'nucleus', foundBy: ['Ada', 'Cy'] },
      ],
      missedWords: ['membrane'],
    });
    expect(mostMissedWords(summary)).toEqual([
      { word: 'membrane', found: 0, of: 4 },
      { word: 'enzyme', found: 1, of: 4 },
    ]);
  });

  it('given the teacher in the room data, when counting, then the teacher is neither a student nor a finder', () => {
    const summary = summaryOf({
      masteryByPlayer: mastery({ 'Ms K': [4, 4], Ada: [0, 4], Ben: [0, 4] }),
      coverage: [{ word: 'enzyme', foundBy: ['Ms K'] }],
    });
    expect(mostMissedWords(summary)).toEqual([{ word: 'enzyme', found: 0, of: 2 }]);
  });

  it('given a record from before per-word coverage, when read, then it falls back to the words nobody found', () => {
    const summary = summaryOf({ masteryByPlayer: fourStudents, coverage: undefined as never, missedWords: ['membrane'] });
    expect(mostMissedWords(summary)).toEqual([{ word: 'membrane', found: 0, of: 4 }]);
  });

  it('given lesson words the board never carried, when listed, then they are marked not-on-board instead of reading as a class failure', () => {
    const summary = summaryOf({
      masteryByPlayer: fourStudents,
      coverage: [{ word: 'membrane', foundBy: [] }, { word: 'Enzyme', foundBy: [] }],
      neverPlacedWords: ['enzyme'],
    } as Partial<ClassroomSummary>);
    expect(mostMissedWords(summary)).toEqual([
      { word: 'membrane', found: 0, of: 4 },
      { word: 'Enzyme', found: 0, of: 4, notOnBoard: true },
    ]);
  });

  it('given no students or no lesson, when read, then there is nothing to reteach', () => {
    expect(mostMissedWords(summaryOf({ coverage: [{ word: 'x', foundBy: [] }] }))).toEqual([]);
    expect(mostMissedWords(summaryOf({ totalWords: 0, masteryByPlayer: fourStudents }))).toEqual([]);
  });
});

describe('studentsUnderHalf', () => {
  it('given a class, when some found under half the lesson, then it counts them without naming anyone', () => {
    const summary = summaryOf({ masteryByPlayer: mastery({ Ada: [3, 4], Ben: [1, 4], Cy: [2, 4], Dee: [0, 4] }) });
    expect(studentsUnderHalf(summary)).toBe(2);
  });

  it('given a solo room, when read, then there is no comparison to make', () => {
    expect(studentsUnderHalf(summaryOf({ masteryByPlayer: mastery({ Ada: [0, 4] }) }))).toBe(0);
  });

  it('given the teacher in the data, when counting, then the teacher is excluded', () => {
    const summary = summaryOf({ masteryByPlayer: mastery({ 'Ms K': [0, 4], Ada: [0, 4], Ben: [4, 4] }) });
    expect(studentsUnderHalf(summary)).toBe(1);
  });
});

describe('reteachList — the one list every replay button sends', () => {
  const twoStudents = mastery({ Ada: [1, 2], Ben: [0, 2] });

  it('given some words most of the class missed, when listed, then those are the replay words', () => {
    const summary = summaryOf({
      totalWords: 2,
      masteryByPlayer: twoStudents,
      coverage: [
        { word: 'osmosis', foundBy: ['Ada', 'Ben'] },
        { word: 'enzyme', foundBy: [] },
      ],
    });
    expect(reteachList(summary).map((w) => w.word)).toEqual(['enzyme']);
  });

  it('given every lesson word went unfound, when listed, then there is no replay (that is Play again)', () => {
    const summary = summaryOf({
      totalWords: 2,
      masteryByPlayer: twoStudents,
      coverage: [
        { word: 'osmosis', foundBy: [] },
        { word: 'enzyme', foundBy: [] },
      ],
    });
    expect(reteachList(summary)).toEqual([]);
  });
});

