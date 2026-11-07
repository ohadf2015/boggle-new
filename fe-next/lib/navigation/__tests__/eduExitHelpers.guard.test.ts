import { describe, it, expect } from 'vitest';
import { educationBackHref, educationHomeFor, type EducationRole } from '@/lib/navigation/educationBackHref';
import {
  classroomGameAndroidBackHref,
  educationExitHref,
  educationSignOutHref,
  educationViewerResolved,
  educationViewerRole,
  joinSuccessHref,
  quickPlayBackHref,
  studentPracticeBackHref,
  studentPracticeHref,
} from '@/lib/navigation/eduExitTargets';
import { sectionHome } from '@/lib/navigation/sectionHome';
import { isEduAppSurface } from '@/lib/navigation/eduAppSurface';
import { joinClassHref, joinNewCodeHref } from '@/components/education/join/joinDestinations';
import { eduErrorExit, type EduErrorArea } from '@/components/education/shell/EduRouteError';

const LOCALES = ['en', 'he', 'es', 'ja', 'ru', 'sv'] as const;

type Viewer = 'undefined' | 'teacher' | 'student' | 'guest';
const VIEWERS: Record<Viewer, { isTeacher: boolean; userRole: string | null | undefined; isAnonymous: boolean | null | undefined }> = {
  undefined: { isTeacher: false, userRole: undefined, isAnonymous: undefined },
  teacher: { isTeacher: true, userRole: 'teacher', isAnonymous: false },
  student: { isTeacher: false, userRole: 'student', isAnonymous: false },
  guest: { isTeacher: false, userRole: null, isAnonymous: true },
};
const ROLES: EducationRole[] = (Object.keys(VIEWERS) as Viewer[]).map((v) => educationViewerRole(VIEWERS[v]));

const EDU_PAGES = [
  'teacher', 'teacher/classroom', 'teacher/classroom/abc', 'teacher/curriculum', 'teacher/upgrade',
  'student', 'student/join', 'student/lessons/7', 'student/quick-play',
  'join', 'join/ABC123',
  'education', 'education/classroom-game', 'education/duels', 'education/duels/d1', 'education/live', 'education/help',
];

function isGameHome(href: string | undefined, locale: string): boolean {
  return href === '/' || href === `/${locale}` || href === `/${locale}/`;
}

/** Every exit helper lands on a classroom surface: no consumer tab bar, no game home. */
function expectEduSurface(href: string | undefined | null, locale: string, label: string) {
  if (href == null) return;
  expect(isGameHome(href, locale), label).toBe(false);
  expect(isEduAppSurface(href), `${label} -> ${href}`).toBe(true);
}

describe.each(LOCALES)('edu exit helpers never land on the game home (locale=%s)', (locale) => {
  it.each(ROLES.map((r) => [String(r), r] as const))('role=%s: hub, back, sign-out and error targets stay in edu', (_, role) => {
    expectEduSurface(educationHomeFor(locale, role), locale, 'home');
    for (const page of EDU_PAGES) {
      const pathname = `/${locale}/${page}`;
      expectEduSurface(educationBackHref({ pathname, locale, role }), locale, `back ${page}`);
      expectEduSurface(educationSignOutHref(locale, role, pathname), locale, `sign-out ${page}`);
      expectEduSurface(sectionHome({ pathname }), locale, `sectionHome ${page}`);
      expectEduSurface(classroomGameAndroidBackHref(pathname, role === 'teacher'), locale, `android ${page}`);
    }
  });

  it('student, guest and join destinations stay in edu', () => {
    for (const href of [
      joinClassHref(locale),
      joinNewCodeHref(locale),
      studentPracticeHref(locale, 'late_join'),
      studentPracticeHref(locale),
      studentPracticeBackHref(locale, null),
      studentPracticeBackHref(locale, 'late_join'),
      quickPlayBackHref(locale, true),
      joinSuccessHref(locale, null),
      joinSuccessHref(locale, 'AB12'),
    ]) {
      expectEduSurface(href, locale, 'join/student');
    }
  });

  it.each(['live', 'student', 'teacher', 'join'] as EduErrorArea[])('error area %s returns to an edu hub', (area) => {
    for (const page of EDU_PAGES) expectEduSurface(eduErrorExit(area, locale, `/${locale}/${page}`, ''), locale, `${area} ${page}`);
  });

  describe('"Exit education" is the only door to the game home', () => {
    const STATES = {
      'auth loading': { loading: true, user: null, profile: null },
      'signed in, profile not loaded': { loading: false, user: { is_anonymous: false }, profile: null },
      'signed in, profile loaded': { loading: false, user: { is_anonymous: false }, profile: {} },
      'anonymous guest': { loading: false, user: { is_anonymous: true }, profile: null },
      'signed out': { loading: false, user: null, profile: null },
    };

    it.each(Object.entries(STATES))('%s: only a resolved viewer with no classroom role gets the game home', (name, state) => {
      const resolved = educationViewerResolved(state);
      for (const role of ROLES) {
        const exit = educationExitHref(locale, role, resolved);
        const allowed = resolved && role === null;
        if (allowed) expect(exit).toBe(`/${locale}`);
        else expect(exit, `${name} role=${role}`).toBeUndefined();
      }
    });

    it('a signed-in viewer whose profile has not loaded is unresolved', () => {
      expect(educationViewerResolved(STATES['signed in, profile not loaded'])).toBe(false);
      expect(educationViewerResolved(STATES['auth loading'])).toBe(false);
      expect(educationViewerResolved(STATES['signed in, profile loaded'])).toBe(true);
      expect(educationViewerResolved(STATES['anonymous guest'])).toBe(true);
    });
  });
});

describe('specific targets', () => {
  it('signing out of a student surface goes to the code entry, a teacher to the education landing', () => {
    expect(educationSignOutHref('en', null, '/en/student/join')).toBe('/en/join');
    expect(educationSignOutHref('en', 'student', '/en/student')).toBe('/en/join');
    expect(educationSignOutHref('he', 'teacher', '/he/teacher')).toBe('/he/education');
  });

  it('late-join practice is the student quick play, back to the code entry', () => {
    expect(studentPracticeHref('en', 'late_join')).toBe('/en/student/quick-play?from=late_join');
    expect(studentPracticeBackHref('en', 'late_join')).toBe('/en/join');
    expect(studentPracticeHref('he')).toBe('/he/student/quick-play');
    expect(studentPracticeBackHref('he', null)).toBe('/he/student');
  });
});
