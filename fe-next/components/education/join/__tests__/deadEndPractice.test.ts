import { describe, it, expect } from 'vitest';
import {
  classPracticeHref,
  guestPracticeHref,
  pickLatestClassLesson,
} from '../deadEndPractice';
import { starterPracticePack } from '../starterPracticePack';

const LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'];

const lesson = (id: string, classroom: string | null, created: string | null, words = 3, lessonCreated?: string) => ({
  id,
  name: `List ${id}`,
  classroom_id: classroom,
  words: Array.from({ length: words }, (_, i) => ({ word: `w${i}` })),
  assignment: created ? { created_at: created } : null,
  created_at: lessonCreated ?? null,
});

describe('dead-end practice targets', () => {
  it('GIVEN any locale THEN the guest target is the no-account practice round under /join', () => {
    for (const loc of LOCALES) expect(guestPracticeHref(loc)).toBe(`/${loc}/join/practice`);
  });

  it('GIVEN a class lesson THEN the target opens its spelling practice directly', () => {
    expect(classPracticeHref('he', 'abc')).toBe('/he/student/lessons/abc?mode=spelling');
  });
});

describe('pickLatestClassLesson', () => {
  it('GIVEN lessons from several classes THEN it picks the newest assigned one in THIS class', () => {
    const picked = pickLatestClassLesson(
      [lesson('old', 'c1', '2026-10-01'), lesson('other', 'c2', '2026-11-05'), lesson('new', 'c1', '2026-11-01')],
      'c1',
    );
    expect(picked?.id).toBe('new');
  });

  it('GIVEN lessons with no assignment (records written before assignments existed) THEN the first usable one still counts', () => {
    expect(pickLatestClassLesson([lesson('a', 'c1', null), lesson('b', 'c1', null)], 'c1')?.id).toBe('a');
  });

  it('GIVEN two unassigned lessons THEN the one created later wins, whatever order the API returned them in', () => {
    const older = lesson('older', 'c1', null, 3, '2026-09-01T00:00:00Z');
    const newer = lesson('newer', 'c1', null, 3, '2026-11-01T00:00:00Z');
    expect(pickLatestClassLesson([older, newer], 'c1')?.id).toBe('newer');
    expect(pickLatestClassLesson([newer, older], 'c1')?.id).toBe('newer');
  });

  it('GIVEN two lessons assigned at the same moment THEN the later-created lesson breaks the tie', () => {
    const a = lesson('a', 'c1', '2026-11-01', 3, '2026-09-01T00:00:00Z');
    const b = lesson('b', 'c1', '2026-11-01', 3, '2026-10-01T00:00:00Z');
    expect(pickLatestClassLesson([a, b], 'c1')?.id).toBe('b');
  });

  it('GIVEN an assigned lesson and unassigned ones THEN the assigned one wins', () => {
    expect(pickLatestClassLesson([lesson('a', 'c1', null), lesson('b', 'c1', '2026-11-01')], 'c1')?.id).toBe('b');
  });

  it('GIVEN a lesson with no words THEN it is skipped, so practice never opens empty', () => {
    expect(pickLatestClassLesson([lesson('empty', 'c1', '2026-11-06', 0), lesson('ok', 'c1', '2026-10-01')], 'c1')?.id).toBe('ok');
  });

  it('GIVEN a lesson owned by another class but assigned to THIS class THEN it counts as this class\'s list', () => {
    const shared = { ...lesson('shared', 'c9', null), assignment: { classroom_id: 'c1', created_at: '2026-11-03' } };
    expect(pickLatestClassLesson([lesson('own', 'c1', '2026-10-01'), shared], 'c1')?.id).toBe('shared');
  });

  it('GIVEN no class or no lessons THEN nothing is picked', () => {
    expect(pickLatestClassLesson([lesson('a', 'c1', null)], null)).toBeNull();
    expect(pickLatestClassLesson([], 'c1')).toBeNull();
  });
});

describe('starterPracticePack', () => {
  it('GIVEN each of the six locales THEN a pack in that language with enough words exists', () => {
    for (const loc of LOCALES) {
      const pack = starterPracticePack(loc);
      expect(pack.language).toBe(loc);
      expect(pack.words.length).toBeGreaterThanOrEqual(8);
      for (const w of pack.words) expect(w.word.trim()).not.toBe('');
    }
  });

  it('GIVEN an unknown locale THEN it falls back to the English pack', () => {
    expect(starterPracticePack('xx').language).toBe('en');
  });
});
