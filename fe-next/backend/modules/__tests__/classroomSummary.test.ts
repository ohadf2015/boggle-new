/**
 * Classroom results summary.
 *
 * The teacher's `lessonGameData` lives in the TEACHER's sessionStorage, so a
 * results screen built from it is blank for all 25 students. The lesson signal
 * has to travel in the results payload every player already receives — this
 * module builds that payload.
 */

import { describe, it, expect } from 'vitest';
import { buildClassroomSummary } from '../classroomSummary.js';

const players = [
  {
    username: 'Maya',
    wordDetails: [
      { word: 'PHOTON', score: 12, validated: true, isDuplicate: false },
      { word: 'atom', score: 8, validated: true, isDuplicate: false },
      { word: 'ZZZZZ', score: 0, validated: false, isDuplicate: false },
    ],
  },
  {
    username: 'Noa',
    wordDetails: [
      { word: 'Atom', score: 0, validated: true, isDuplicate: true },
    ],
  },
];

const base = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Physics 101'],
  lessonIds: ['lesson-1'],
  vocabularyWords: ['photon', 'atom', 'neutron'],
  players,
};

describe('buildClassroomSummary', () => {
  it('reports every lesson word, including the ones nobody found', () => {
    const summary = buildClassroomSummary(base);
    expect(summary.coverage.map((c) => c.word)).toEqual(['photon', 'atom', 'neutron']);
    expect(summary.coverage.find((c) => c.word === 'neutron')?.foundBy).toEqual([]);
  });

  it('matches lesson words case-insensitively so casing never hides a hit', () => {
    const summary = buildClassroomSummary(base);
    expect(summary.coverage.find((c) => c.word === 'photon')?.foundBy).toEqual(['Maya']);
    expect(summary.coverage.find((c) => c.word === 'atom')?.foundBy).toEqual(['Maya', 'Noa']);
  });

  it('credits a duplicate: the student still found the word, it just scored zero', () => {
    const summary = buildClassroomSummary(base);
    expect(summary.masteryByPlayer.Noa).toEqual({ found: 1, total: 3 });
  });

  it('ignores words the validator rejected', () => {
    const summary = buildClassroomSummary(base);
    expect(summary.coverage.some((c) => c.word.toUpperCase() === 'ZZZZZ')).toBe(false);
    expect(summary.masteryByPlayer.Maya).toEqual({ found: 2, total: 3 });
  });

  it('surfaces the words the whole class missed, for the teacher to reteach', () => {
    const summary = buildClassroomSummary(base);
    expect(summary.missedWords).toEqual(['neutron']);
    expect(summary.classFoundCount).toBe(2);
  });

  it('carries the lesson identity so students see whose class this was', () => {
    const summary = buildClassroomSummary(base);
    expect(summary.teacherName).toBe('Ms. Cohen');
    expect(summary.lessonNames).toEqual(['Physics 101']);
    expect(summary.lessonIds).toEqual(['lesson-1']);
    expect(summary.totalWords).toBe(3);
  });

  it('returns null when the game carried no lesson vocabulary', () => {
    expect(buildClassroomSummary({ ...base, vocabularyWords: [] })).toBeNull();
  });

  it('de-duplicates a vocabulary list that repeats a word across lessons', () => {
    const summary = buildClassroomSummary({
      ...base,
      vocabularyWords: ['atom', 'ATOM', 'photon'],
    });
    expect(summary?.coverage.map((c) => c.word)).toEqual(['atom', 'photon']);
    expect(summary?.totalWords).toBe(2);
  });

  it('never lets a player appear twice in foundBy when they repeat a word', () => {
    const summary = buildClassroomSummary({
      ...base,
      players: [
        {
          username: 'Maya',
          wordDetails: [
            { word: 'atom', score: 8, validated: true, isDuplicate: false },
            { word: 'ATOM', score: 0, validated: true, isDuplicate: true },
          ],
        },
      ],
    });
    expect(summary?.coverage.find((c) => c.word === 'atom')?.foundBy).toEqual(['Maya']);
  });

  it('excludes bots — a bot finding a word must not clear it off the reteach list', () => {
    const summary = buildClassroomSummary({
      ...base,
      players: [
        ...players,
        {
          username: 'Vocab Vulture Bot',
          isBot: true,
          wordDetails: [{ word: 'neutron', score: 20, validated: true, isDuplicate: false }],
        },
      ],
    });
    // 'neutron' was found ONLY by the bot, so the class still needs to be retaught it.
    expect(summary!.missedWords).toEqual(['neutron']);
    expect(summary!.coverage.find((c) => c.word === 'neutron')?.foundBy).toEqual([]);
    expect(summary!.classFoundCount).toBe(2);
    expect(summary!.masteryByPlayer['Vocab Vulture Bot']).toBeUndefined();
  });

  it('matches Hebrew lesson words against the normalized form players actually trace', () => {
    // The board yields base letters; the lesson stores the natural final form.
    // Without normalizing both sides this reads as "nobody found it".
    const summary = buildClassroomSummary({
      ...base,
      language: 'he',
      vocabularyWords: ['שלום'],
      players: [
        {
          username: 'Maya',
          wordDetails: [{ word: 'שלומ', score: 10, validated: true, isDuplicate: false }],
        },
      ],
    });
    expect(summary!.coverage[0].foundBy).toEqual(['Maya']);
    expect(summary!.missedWords).toEqual([]);
  });

  it('still displays the Hebrew lesson word in its natural form', () => {
    const summary = buildClassroomSummary({
      ...base,
      language: 'he',
      vocabularyWords: ['שלום'],
      players: [],
    });
    expect(summary!.coverage[0].word).toBe('שלום');
  });
});
