/**
 * Route matrix: every education entry/exit must land inside education.
 * Destinations that leave the education context (bare locale root, /) fail here.
 */
import { describe, it, expect } from 'vitest';
import { sectionHome } from '@/lib/navigation/sectionHome';
import { parentRoute } from '@/lib/navigation/parentRoute';
import { educationBackHref, educationHomeFor, type EducationRole } from '@/lib/navigation/educationBackHref';
import { multiplayerExitDestination, mpExit } from '@/lib/multiplayer/exitDestination';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const ROLES: EducationRole[] = ['teacher', 'student', null];

const EDU_PAGES = [
  'teacher', 'teacher/classroom', 'teacher/reports', 'teacher/curriculum', 'teacher/profile',
  'teacher/classroom/abc123/analytics', 'student', 'student/join', 'student/lessons/x',
  'student/achievements', 'student/profile', 'education', 'education/classroom-game',
  'education/duels', 'education/duels/abc123', 'education/access', 'education/for-schools',
  'education/games-for-teachers', 'education/spelling-bee-practice', 'education/esl-word-games',
  'join/ABC123', 'classroom',
];

const EDU_SEO_TOP_LEVEL = [
  'word-games-for-the-classroom', 'substitute-teacher-word-games', 'bell-ringer-word-games',
  'vocabulary-games-for-middle-school', 'hebrew-classroom-vocabulary-games', 'juegos-vocabulario-aula',
];

const isBareHome = (dest: string, locale: string) => dest === '/' || dest === `/${locale}`;

describe.each(LOCALES)('education route matrix — locale=%s', (locale) => {
  describe('header exit per role', () => {
    it.each(ROLES)('role=%s lands inside education', (role) => {
      const dest = educationHomeFor(locale, role);
      expect(isBareHome(dest, locale)).toBe(false);
      expect(dest.startsWith(`/${locale}/`)).toBe(true);
    });

    it('teacher → teacher hub, student → student hub, guest → education landing', () => {
      expect(educationHomeFor(locale, 'teacher')).toBe(`/${locale}/teacher`);
      expect(educationHomeFor(locale, 'student')).toBe(`/${locale}/student`);
      expect(educationHomeFor(locale, null)).toBe(`/${locale}/education`);
    });
  });

  describe('back from each education page', () => {
    it.each(EDU_PAGES)('/%s back per role never reaches bare home', (path) => {
      for (const role of ROLES) {
        const dest = educationBackHref({ pathname: `/${locale}/${path}`, locale, role });
        expect(isBareHome(dest, locale)).toBe(false);
      }
    });
  });

  describe('error / 404 boundary per education path', () => {
    it.each(EDU_PAGES)('/%s stays in education', (path) => {
      const dest = sectionHome({ pathname: `/${locale}/${path}` });
      expect(isBareHome(dest, locale)).toBe(false);
      expect(dest.startsWith(`/${locale}/`)).toBe(true);
    });

    it.each(EDU_SEO_TOP_LEVEL)('SEO landing /%s falls back to education', (seg) => {
      expect(sectionHome({ pathname: `/${locale}/${seg}` })).toBe(`/${locale}/education`);
    });

    it('bare education landing falls back to an education page other than itself', () => {
      expect(sectionHome({ pathname: `/${locale}/education` })).toBe(`/${locale}/education/for-schools`);
    });
  });

  describe('back-one-level for top-level SEO pages', () => {
    it.each(EDU_SEO_TOP_LEVEL)('/%s → /education', (seg) => {
      expect(parentRoute(`/${locale}/${seg}`)).toBe(`/${locale}/education`);
    });
  });

  describe('classroom game exit and back per role', () => {
    it('teacher host exits to the teacher hub', () => {
      expect(multiplayerExitDestination({ isClassroomMode: true, isHost: true, locale })).toBe(`/${locale}/teacher`);
    });

    it('student exits to the student hub', () => {
      expect(multiplayerExitDestination({ isClassroomMode: true, isHost: false, locale })).toBe(`/${locale}/student`);
    });

    it('back-from-entry in a classroom room never leaves education', () => {
      for (const isHost of [true, false]) {
        const action = mpExit('back-from-entry', { isClassroomMode: true, isHost, locale, previousPath: null });
        expect(action).toEqual({ kind: 'navigate', href: isHost ? `/${locale}/teacher` : `/${locale}/student` });
      }
    });
  });
});
