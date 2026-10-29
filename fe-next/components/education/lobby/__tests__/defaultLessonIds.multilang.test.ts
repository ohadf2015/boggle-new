import { describe, it, expect, beforeEach } from 'vitest';
import { defaultLessonIdsFor, readRecentLessonPicks } from '../useTeacherLobbyData';

const lesson = (id: string, language: string) => ({ id, language }) as never;
const NEWEST_FIRST = [lesson('he-new', 'he'), lesson('en-old', 'en'), lesson('en-older', 'en')];

describe('default lesson for a multi-language class', () => {
  beforeEach(() => window.localStorage.clear());

  it('Given no launch history, Then the newest list of ANY language is picked, not the newest in the class language', () => {
    expect(defaultLessonIdsFor(NEWEST_FIRST, 'c1', [])).toEqual(['he-new']);
  });

  it('Given this class last played two English lists, Then those lists come back', () => {
    const recent = [{ classroomId: 'c1', lessonIds: ['en-old', 'en-older'], savedAt: 2 }];
    expect(defaultLessonIdsFor(NEWEST_FIRST, 'c1', recent)).toEqual(['en-old', 'en-older']);
  });

  it('Given another class played more recently, Then this class keeps its own last list', () => {
    const recent = [
      { classroomId: 'c2', lessonIds: ['en-older'], savedAt: 9 },
      { classroomId: 'c1', lessonIds: ['en-old'], savedAt: 1 },
    ];
    expect(defaultLessonIdsFor(NEWEST_FIRST, 'c1', recent)).toEqual(['en-old']);
  });

  it('Given only another class has history, Then this class gets the newest list, not the other class’s pick', () => {
    expect(defaultLessonIdsFor(NEWEST_FIRST, 'c1', [{ classroomId: 'c2', lessonIds: ['en-older'], savedAt: 9 }])).toEqual(['he-new']);
  });

  it('Given a remembered list was deleted, Then only the lists that still exist return, and none at all falls back to the newest', () => {
    expect(defaultLessonIdsFor(NEWEST_FIRST, 'c1', [{ classroomId: 'c1', lessonIds: ['gone', 'en-old'], savedAt: 1 }])).toEqual(['en-old']);
    expect(defaultLessonIdsFor(NEWEST_FIRST, 'c1', [{ classroomId: 'c1', lessonIds: ['gone'], savedAt: 1 }])).toEqual(['he-new']);
  });

  it('Given a remembered pick somehow mixed languages, Then only the first list language survives (one game, one language)', () => {
    const recent = [{ classroomId: 'c1', lessonIds: ['en-old', 'he-new'], savedAt: 1 }];
    expect(defaultLessonIdsFor(NEWEST_FIRST, 'c1', recent)).toEqual(['en-old']);
  });

  it('Given no lists, Then nothing is picked', () => {
    expect(defaultLessonIdsFor([], 'c1', [])).toEqual([]);
  });

  it('reads launch history synchronously from storage, newest first, and survives junk', () => {
    window.localStorage.setItem(
      'lexiclash_recent_game_settings',
      JSON.stringify([
        { classroomId: 'c1', lessonIds: ['a'], savedAt: 1 },
        { classroomId: 'c1', lessonIds: ['b'], savedAt: 5 },
        { nope: true },
      ])
    );
    expect(readRecentLessonPicks().map((p) => p.lessonIds)).toEqual([['b'], ['a']]);
    window.localStorage.setItem('lexiclash_recent_game_settings', '{broken');
    expect(readRecentLessonPicks()).toEqual([]);
  });
});
