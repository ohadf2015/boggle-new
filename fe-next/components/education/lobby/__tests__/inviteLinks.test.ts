import { describe, expect, it } from 'vitest';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';
import { QUICK_LAUNCH_FLOW } from '@/components/teacher/dashboard/quickLaunchIntent';
import { firstStudentSeen, inviteHref, inviteStartTarget, libraryHref, safeReturnTo } from '../inviteLinks';

const PACK = STARTER_LESSON_PACKS[0];

describe('inviteStartTarget', () => {
  it('Given a known starter pack, When the teacher starts, Then it runs the express launch with that pack and class', () => {
    const target = inviteStartTarget({ locale: 'en', classroomId: 'c1', packKey: PACK.nameKey });
    expect(target.href).toBe(`/en/education/classroom-game?flow=${QUICK_LAUNCH_FLOW}`);
    expect(target.intent).toMatchObject({ source: 'pack', packKey: PACK.nameKey, language: PACK.language, classroomId: 'c1' });
  });

  it('Given no pack or an unknown one, When the teacher starts, Then it opens the lobby on that class with no intent', () => {
    for (const packKey of [null, 'evil.key', '']) {
      const target = inviteStartTarget({ locale: 'he', classroomId: 'c2', packKey });
      expect(target.intent).toBeNull();
      expect(target.href).toBe('/he/education/classroom-game?classroomId=c2&minutes=2');
    }
  });
});

describe('inviteHref', () => {
  it('opens the invite step for a class and carries a valid pack only', () => {
    expect(inviteHref('en', 'c1')).toBe('/en/teacher/classroom/new?classroomId=c1');
    expect(inviteHref('en', 'c1', PACK.nameKey)).toBe(`/en/teacher/classroom/new?classroomId=c1&pack=${encodeURIComponent(PACK.nameKey)}`);
    expect(inviteHref('en', 'c1', 'nope')).toBe('/en/teacher/classroom/new?classroomId=c1');
  });
});

describe('safeReturnTo', () => {
  it('keeps same-locale app paths', () => {
    expect(safeReturnTo('/en/education/classroom-game?classroomId=c1', 'en')).toBe('/en/education/classroom-game?classroomId=c1');
  });

  it('drops anything that could leave the app or the locale', () => {
    for (const raw of [null, '', 'https://evil.test', '//evil.test/en/x', '/\\evil.test', '/he/teacher', 'en/teacher', '/en', '/en/../../x', 'javascript:alert(1)']) {
      expect(safeReturnTo(raw, 'en')).toBeNull();
    }
  });
});

describe('libraryHref', () => {
  it('opens the Library on the class with a way back to the lobby', () => {
    const href = libraryHref('en', 'c1');
    const url = new URL(href, 'http://x');
    expect(url.pathname).toBe('/en/teacher/curriculum');
    expect(url.searchParams.get('classroomId')).toBe('c1');
    expect(url.searchParams.get('returnTo')).toBe('/en/education/classroom-game?classroomId=c1');
  });

  it('still returns to the lobby without a class', () => {
    const url = new URL(libraryHref('en', null), 'http://x');
    expect(url.searchParams.get('classroomId')).toBeNull();
    expect(url.searchParams.get('returnTo')).toBe('/en/education/classroom-game');
  });
});

describe('firstStudentSeen', () => {
  it('fires only on a 0 -> 1+ change seen on this screen', () => {
    expect(firstStudentSeen(null, 3)).toBe(false);
    expect(firstStudentSeen(0, 0)).toBe(false);
    expect(firstStudentSeen(0, 1)).toBe(true);
    expect(firstStudentSeen(0, 4)).toBe(true);
    expect(firstStudentSeen(2, 3)).toBe(false);
  });
});
