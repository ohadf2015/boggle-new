/**
 * Route matrix: every education entry and exit lands on an exact destination.
 * A bare locale root or "/" anywhere in the table is a failure by construction.
 */
import { describe, it, expect } from 'vitest';
import { sectionHome } from '@/lib/navigation/sectionHome';
import { parentRoute } from '@/lib/navigation/parentRoute';
import { educationBackHref, educationHomeFor, type EducationRole } from '@/lib/navigation/educationBackHref';
import { multiplayerExitDestination, mpExit } from '@/lib/multiplayer/exitDestination';
import {
  classroomGameAndroidBackHref,
  joinSuccessHref,
  quickPlayBackHref,
} from '@/lib/navigation/eduExitTargets';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const ROLES: EducationRole[] = ['teacher', 'student', null];

/** Back target per page: a fixed suffix, or 'hub' = the role's education home. */
const BACK: Array<[string, string]> = [
  ['teacher/classroom', 'teacher'],
  ['teacher/reports', 'teacher'],
  ['teacher/curriculum', 'teacher'],
  ['teacher/profile', 'teacher'],
  ['teacher/classroom/abc123/analytics', 'teacher'],
  ['student/join', 'education'],
  ['student/lessons/x', 'student'],
  ['student/achievements', 'student'],
  ['student/profile', 'student'],
  ['education', 'hub'],
  ['education/classroom-game', 'hub'],
  ['education/duels', 'hub'],
  ['education/duels/abc123', 'hub'],
  ['education/access', 'hub'],
  ['education/for-schools', 'hub'],
  ['education/games-for-teachers', 'hub'],
  ['education/spelling-bee-practice', 'hub'],
  ['education/esl-word-games', 'hub'],
  ['join/ABC123', 'hub'],
  ['classroom', 'hub'],
];

const EDU_PAGES = BACK.map(([path]) => path);

const SEO_TOP_LEVEL = [
  'word-games-for-the-classroom',
  'substitute-teacher-word-games',
  'bell-ringer-word-games',
  'vocabulary-games-for-middle-school',
  'hebrew-classroom-vocabulary-games',
  'juegos-vocabulario-aula',
];

const roleHub = (locale: string, role: EducationRole) => educationHomeFor(locale, role);

describe.each(LOCALES)('education route matrix, locale=%s', (locale) => {
  const at = (suffix: string) => `/${locale}/${suffix}`;

  describe('header exit per role', () => {
    it('teacher → teacher hub, student → student hub, guest → education landing', () => {
      expect(educationHomeFor(locale, 'teacher')).toBe(at('teacher'));
      expect(educationHomeFor(locale, 'student')).toBe(at('student'));
      expect(educationHomeFor(locale, null)).toBe(at('education'));
    });

    it('landing header logo goes to the education landing, not the marketing home', () => {
      expect(educationHomeFor(locale, null)).toBe(at('education'));
    });
  });

  describe('back from each education page, exact per role', () => {
    it.each(BACK)('/%s', (path, expected) => {
      for (const role of ROLES) {
        const dest = educationBackHref({ pathname: at(path), locale, role });
        const want = expected === 'hub' ? roleHub(locale, role) : at(expected);
        expect(dest, `role=${role}`).toBe(want);
      }
    });
  });

  describe('error / 404 boundary, exact', () => {
    it.each(EDU_PAGES)('/%s → its role hub, or the education landing', (path) => {
      let want = at('education');
      if (path === 'education' || path === 'education/classroom-game') want = at('education/for-schools');
      else if (path.startsWith('teacher/')) want = at('teacher');
      else if (path.startsWith('student/') && path !== 'student/join') want = at('student');
      expect(sectionHome({ pathname: at(path) })).toBe(want);
    });

    it('classroom-game error does not return to the landing that bounces approved teachers back into it', () => {
      expect(sectionHome({ pathname: at('education/classroom-game') })).toBe(at('education/for-schools'));
    });

    it.each(SEO_TOP_LEVEL)('SEO landing /%s → education landing', (seg) => {
      expect(sectionHome({ pathname: at(seg) })).toBe(at('education'));
    });
  });

  describe('back one level for top-level SEO pages', () => {
    it.each(SEO_TOP_LEVEL)('/%s → education landing', (seg) => {
      expect(parentRoute(at(seg))).toBe(at('education'));
    });
  });

  describe('classroom game exit and back per role', () => {
    it('host exits to the teacher hub, student to the student hub', () => {
      expect(multiplayerExitDestination({ isClassroomMode: true, isHost: true, locale })).toBe(at('teacher'));
      expect(multiplayerExitDestination({ isClassroomMode: true, isHost: false, locale })).toBe(at('student'));
    });

    it('back-from-entry in a classroom room stays on the role hub', () => {
      expect(mpExit('back-from-entry', { isClassroomMode: true, isHost: true, locale, previousPath: null }))
        .toEqual({ kind: 'navigate', href: at('teacher') });
      expect(mpExit('back-from-entry', { isClassroomMode: true, isHost: false, locale, previousPath: null }))
        .toEqual({ kind: 'navigate', href: at('student') });
    });
  });

  describe('android hardware back with no history', () => {
    it('classroom-game for a teacher goes to the teacher hub, not the landing', () => {
      expect(classroomGameAndroidBackHref(at('education/classroom-game'), true)).toBe(at('teacher'));
    });

    it('classroom-game for a non-teacher is left to the URL parent', () => {
      expect(classroomGameAndroidBackHref(at('education/classroom-game'), false)).toBeNull();
      expect(parentRoute(at('education/classroom-game'))).toBe(at('education'));
    });
  });

  describe('academy solo play', () => {
    it('quick-play opened from the academy backs to the student academy', () => {
      expect(quickPlayBackHref(locale, true)).toBe(at('student'));
    });

    it('quick-play opened from the arcade keeps its default parent', () => {
      expect(quickPlayBackHref(locale, false)).toBeUndefined();
    });
  });

  describe('join', () => {
    it('success with a live game code walks into the room with classroom context', () => {
      const href = joinSuccessHref(locale, 'ABC123');
      expect(href).toBe(`${at('multiplayer')}?room=ABC123&classroom=true`);
    });

    it('success without a game code lands on the student hub', () => {
      expect(joinSuccessHref(locale, null)).toBe(at('student'));
    });
  });
});
