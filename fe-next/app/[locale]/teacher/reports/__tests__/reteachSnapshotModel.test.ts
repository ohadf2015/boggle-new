import { describe, expect, it } from 'vitest';
import type { HardWord } from '@/lib/education/wordMasteryReport';
import {
  classesToFetch,
  exampleSnapshot,
  pickSnapshot,
  snapshotWords,
  type ClassEvidence,
} from '../reteachSnapshotModel';

const word = (w: string, missRate: number, studentsMissing = 1, studentsAsked = 4): HardWord => ({
  word: w,
  display: w,
  attempts: 8,
  missed: Math.round((missRate / 100) * 8),
  missRate,
  studentsMissing,
  studentsAsked,
});

const evidence = (over: Partial<ClassEvidence>): ClassEvidence => ({
  classroomId: 'c1',
  classroomName: 'Room 1',
  sessions: 4,
  classAccuracy: 70,
  words: [word('cloud', 60)],
  needsHelp: [],
  locked: false,
  ...over,
});

describe('classesToFetch', () => {
  it('given classes with and without students, when picked, then only classes with students, biggest first, capped', () => {
    const picked = classesToFetch(
      [
        { id: 'a', name: 'A', member_count: 0 },
        { id: 'b', name: 'B', member_count: 3 },
        { id: 'c', name: 'C', member_count: 9 },
        { id: 'd', name: 'D' },
      ],
      1
    );
    expect(picked.map((c) => c.id)).toEqual(['c']);
  });
});

describe('snapshotWords', () => {
  it('given words nobody missed, when shown, then they are dropped and the rest ranked by miss rate, capped', () => {
    const shown = snapshotWords([word('rain', 0), word('frost', 40), word('storm', 75), word('cloud', 50)], 2);
    expect(shown.map((w) => w.word)).toEqual(['storm', 'cloud']);
  });
});

describe('pickSnapshot', () => {
  it('given no class has missed words, when picked, then there is nothing real to show', () => {
    expect(pickSnapshot([evidence({ words: [] }), evidence({ words: [word('rain', 0)] })])).toBeNull();
  });

  it('given several classes with evidence, when picked, then the class with the most games wins', () => {
    const picked = pickSnapshot([
      evidence({ classroomId: 'small', sessions: 2 }),
      evidence({ classroomId: 'big', sessions: 9 }),
    ]);
    expect(picked?.classroomId).toBe('big');
  });
});

describe('exampleSnapshot', () => {
  it('given sample words and names, when built, then it reads as a class with missed words and students needing help', () => {
    const ex = exampleSnapshot(['thunder', 'breeze', 'frost', 'cloud'], ['Maya', 'Leo']);
    expect(ex.words.map((w) => w.display)).toEqual(['thunder', 'breeze', 'frost', 'cloud']);
    expect(ex.words.every((w) => w.missRate > 0 && w.studentsMissing <= w.studentsAsked)).toBe(true);
    expect(ex.words.map((w) => w.missRate)).toEqual([...ex.words.map((w) => w.missRate)].sort((a, b) => b - a));
    expect(ex.needsHelp).toEqual(['Maya', 'Leo']);
  });
});
