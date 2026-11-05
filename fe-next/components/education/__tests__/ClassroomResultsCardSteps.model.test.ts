import { describe, it, expect } from 'vitest';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { resultSteps, studentLessonTally, studentLine, studentMissedWords } from '../ClassroomResultsCardSteps.model';

const summary: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Physics 101'],
  lessonIds: ['lesson-1'],
  totalWords: 5,
  coverage: [
    { word: 'photon', foundBy: ['Maya'] },
    { word: 'atom', foundBy: ['Maya', 'noa'] },
    { word: 'neutron', foundBy: [] },
    { word: 'quark', foundBy: [] },
    { word: 'Gluon', foundBy: [] },
  ],
  missedWords: ['neutron', 'quark', 'Gluon'],
  neverPlacedWords: ['gluon'],
  classFoundCount: 2,
  masteryByPlayer: { Maya: { found: 2, total: 5 }, Noa: { found: 1, total: 5 } },
};

describe('studentMissedWords', () => {
  it('given a student, when listing misses, then it returns the lesson words they did not find, case-insensitively', () => {
    expect(studentMissedWords(summary, 'Noa')).toEqual(['photon', 'neutron', 'quark']);
  });

  it('given words the board never carried, when listing misses, then they are not counted as misses', () => {
    expect(studentMissedWords(summary, 'Noa')).not.toContain('Gluon');
  });

  it('given a late joiner with no row, when listing misses, then every placed word is a miss', () => {
    expect(studentMissedWords(summary, 'Dana')).toEqual(['photon', 'atom', 'neutron', 'quark']);
  });
});

describe('studentLessonTally', () => {
  it('given misses, when tallying, then found and total agree with the missed list', () => {
    expect(studentLessonTally(summary, 'Noa')).toEqual({ found: 1, total: 4 });
  });
});

describe('studentLine', () => {
  const standings = [
    { username: 'Ms. Cohen', score: 0 },
    { username: 'Maya', score: 90 },
    { username: 'Bot', score: 80, isBot: true },
    { username: 'Noa', score: 70 },
  ];

  it('given standings, when finding the student, then rank counts humans only and skips the host', () => {
    expect(studentLine(summary, 'noa', standings)).toEqual({ score: 70, rank: 2, players: 2 });
  });

  it('given no standings, when finding the student, then there is no line', () => {
    expect(studentLine(summary, 'Noa', undefined)).toBeNull();
  });
});

describe('resultSteps', () => {
  it('given a score and misses, when ordering, then score, lesson, then missed words', () => {
    expect(resultSteps({ hasScore: true, missedCount: 3 })).toEqual(['score', 'lesson', 'missed']);
  });

  it('given no misses, when ordering, then the missed-words step is skipped', () => {
    expect(resultSteps({ hasScore: true, missedCount: 0 })).toEqual(['score', 'lesson']);
  });

  it('given no score line, when ordering, then the flow starts at the lesson step', () => {
    expect(resultSteps({ hasScore: false, missedCount: 2 })).toEqual(['lesson', 'missed']);
  });
});
