/**
 * Per-student learning arc — the free teacher analytics surface.
 *
 * The bar this file guards (evidence pack §8.2): the STUDENT, not the session,
 * is the analytics unit. That needs two things `buildClassMastery` folded away:
 * the accuracy time axis (one point per asked session, for the sparkline) and
 * the per-word outcome history (the dots a teacher reads as "still missing it").
 * Plus the class-view row model: EVERY roster student appears, evidence or not —
 * a student who never shows up in sessions is the one a flat table hides.
 */

import { describe, it, expect } from 'vitest';
import {
  buildClassMastery,
  buildSessionAccuracySeries,
  type MasterySessionRow,
} from '@/lib/education/wordMasteryTrend';
import {
  buildClassArcRows,
  pickFollowUpWords,
} from '@/lib/education/studentArc';

function askedRow(
  studentId: string,
  startedAt: string,
  gameCode: string,
  asked: string[],
  found: string[]
): MasterySessionRow {
  return {
    studentId,
    startedAt,
    results: {
      gameCode,
      gameMode: 'vocab-quiz',
      lessonWordsAsked: asked,
      lessonWordsFound: found,
      lessonWordsMissed: asked.filter((w) => !found.includes(w)),
    },
  };
}

function boardRow(studentId: string, startedAt: string, gameCode: string): MasterySessionRow {
  return {
    studentId,
    startedAt,
    results: { gameCode, gameMode: 'word-hunt', lessonWordsFound: [], lessonWordsMissed: ['ghost'] },
  };
}

describe('word trajectories keep their outcome history', () => {
  it('Given two asked sessions out of order, When building, Then outcomes are oldest first', () => {
    const out = buildClassMastery([
      askedRow('s1', '2026-09-20T10:00:00Z', 'G2', ['apple'], ['apple']),
      askedRow('s1', '2026-09-10T10:00:00Z', 'G1', ['apple'], []),
    ]);
    const word = out.students[0].words.find((w) => w.word === 'apple');
    expect(word?.outcomes).toEqual([false, true]);
    expect(word?.trend).toBe('improving');
  });
});

describe('buildSessionAccuracySeries — the growth axis', () => {
  it('Given mixed sessions, When building, Then each asked session is one chronological point', () => {
    const series = buildSessionAccuracySeries([
      boardRow('s1', '2026-09-05T10:00:00Z', 'G0'),
      askedRow('s1', '2026-09-15T10:00:00Z', 'G2', ['a', 'b', 'c', 'd'], ['a', 'b']),
      askedRow('s1', '2026-09-10T10:00:00Z', 'G1', ['a', 'b'], ['a']),
    ]);

    const points = series.get('s1');
    expect(points).toHaveLength(2);
    expect(points?.[0]).toMatchObject({ gameCode: 'G1', asked: 2, found: 1, accuracy: 50 });
    expect(points?.[1]).toMatchObject({ gameCode: 'G2', asked: 4, found: 2, accuracy: 50 });
    expect(new Date(points?.[0].at ?? 0).getTime()).toBeLessThan(new Date(points?.[1].at ?? 0).getTime());
  });

  it('Given duplicate (game, student) rows, When building, Then the game counts once', () => {
    const row = askedRow('s1', '2026-09-10T10:00:00Z', 'G1', ['a'], ['a']);
    const series = buildSessionAccuracySeries([row, { ...row }]);
    expect(series.get('s1')).toHaveLength(1);
  });
});

describe('buildClassArcRows — every roster student appears', () => {
  const mastery = buildClassMastery([
    askedRow('s1', '2026-09-10T10:00:00Z', 'G1', ['apple', 'plum'], ['apple']),
    askedRow('s1', '2026-09-20T10:00:00Z', 'G2', ['apple', 'plum'], ['apple']),
    askedRow('s2', '2026-09-10T10:00:00Z', 'G1', ['apple', 'plum'], ['apple', 'plum']),
    askedRow('s2', '2026-09-20T10:00:00Z', 'G2', ['apple', 'plum'], ['apple', 'plum']),
  ]);

  it('Given a roster wider than the evidence, When building, Then the silent student is a row with zero evidence', () => {
    const rows = buildClassArcRows(mastery, [
      { studentId: 's1', name: 'Stuck Sam' },
      { studentId: 's2', name: 'Mastered Mia' },
      { studentId: 's3', name: 'Quiet Quinn' },
    ]);
    expect(rows.map((r) => r.studentId).sort()).toEqual(['s1', 's2', 's3']);
    const quiet = rows.find((r) => r.studentId === 's3');
    expect(quiet).toMatchObject({ mastered: 0, improving: 0, stuck: 0, hasEvidence: false, lastActive: null });
  });

  it('Given counts, When building, Then stuck-first ordering puts follow-ups on top', () => {
    const rows = buildClassArcRows(mastery, [
      { studentId: 's2', name: 'Mastered Mia' },
      { studentId: 's1', name: 'Stuck Sam' },
    ]);
    expect(rows[0].studentId).toBe('s1');
    const sam = rows[0];
    expect(sam.stuck).toBe(1);
    expect(sam.mastered).toBe(1);
    expect(sam.hasEvidence).toBe(true);
    expect(sam.lastActive).toBe('2026-09-20T10:00:00.000Z');
  });

  it('Given no mastery at all, When building, Then the roster still renders', () => {
    const rows = buildClassArcRows(null, [{ studentId: 's1', name: 'New Ned' }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].hasEvidence).toBe(false);
  });
});

describe('pickFollowUpWords — the remediation payload', () => {
  it('Given ranked stuck words, When picking, Then the worst come first within the cap', () => {
    const stuck = [
      { word: 'a', display: 'Apple', studentsStuck: 3, studentsWithEvidence: 4 },
      { word: 'b', display: 'Berry', studentsStuck: 2, studentsWithEvidence: 3 },
      { word: 'c', display: 'Cherry', studentsStuck: 1, studentsWithEvidence: 2 },
    ];
    expect(pickFollowUpWords(stuck, 2)).toEqual(['Apple', 'Berry']);
  });

  it('Given duplicate displays under different keys, When picking, Then the lesson gets each word once', () => {
    const stuck = [
      { word: 'apple', display: 'Apple', studentsStuck: 2, studentsWithEvidence: 2 },
      { word: 'apple ', display: 'Apple', studentsStuck: 1, studentsWithEvidence: 1 },
    ];
    expect(pickFollowUpWords(stuck, 10)).toEqual(['Apple']);
  });
});
