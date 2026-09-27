/**
 * Guard: no education navigation-fallback path (sectionHome /
 * multiplayerExitDestination) may ever bounce a teacher or student to the
 * bare app home ('/{locale}' or '/').
 *
 * PostHog: 31% of education pageviews are followed by a homepage view within
 * 60s — the root causes were error boundaries, guards and dead links quietly
 * resolving to '/'. This test enumerates every education-flow path this repo
 * knows about and asserts the fallback destination always stays inside
 * education (or, for a classroom multiplayer room, inside the teacher/student
 * hub) — never the bare locale root.
 */
import { describe, it, expect } from 'vitest';
import { sectionHome } from '@/lib/navigation/sectionHome';
import { multiplayerExitDestination } from '@/lib/multiplayer/exitDestination';

const LOCALES = ['en', 'he'] as const;

/** Every education-flow path this task's root-cause list names. */
const EDUCATION_PATHS = [
  'teacher',
  'teacher/classroom',
  'teacher/reports',
  'teacher/curriculum',
  'teacher/profile',
  'teacher/classroom/abc123/analytics',
  'student',
  'student/lessons/x',
  'student/achievements',
  'student/profile',
  'education/classroom-game',
  'education/duels',
  'education/duels/abc123',
  'education/access',
  'education/miss-gap-assignment',
  'education/miss-gap-whatsapp',
  'education/unplugged-reteach',
  'join/ABC',
];

function isBareHome(dest: string, locale: string): boolean {
  return dest === '/' || dest === `/${locale}`;
}

describe('education navigation fallbacks never resolve to the bare homepage', () => {
  describe.each(LOCALES)('locale=%s', (locale) => {
    it.each(EDUCATION_PATHS)('sectionHome(/%s/%s) stays in education', (path) => {
      const dest = sectionHome({ pathname: `/${locale}/${path}` });
      expect(isBareHome(dest, locale)).toBe(false);
      expect(dest.startsWith(`/${locale}/`)).toBe(true);
    });
  });

  describe.each(LOCALES)('locale=%s — multiplayer classroom rooms', (locale) => {
    it('a classroom multiplayer room (student) via sectionHome search never resolves home', () => {
      const dest = sectionHome({
        pathname: `/${locale}/multiplayer`,
        search: '?room=XYZ&classroom=true',
      });
      expect(isBareHome(dest, locale)).toBe(false);
    });

    it('a classroom multiplayer room (host/teacher) via sectionHome search never resolves home', () => {
      const dest = sectionHome({
        pathname: `/${locale}/multiplayer`,
        search: '?room=XYZ&classroom=true&host=true',
      });
      expect(isBareHome(dest, locale)).toBe(false);
    });

    it('multiplayerExitDestination(classroom, student) never resolves to the bare home', () => {
      const dest = multiplayerExitDestination({ isClassroomMode: true, isHost: false, locale });
      expect(dest).not.toBeNull();
      expect(isBareHome(dest as string, locale)).toBe(false);
    });

    it('multiplayerExitDestination(classroom, host) never resolves to the bare home', () => {
      const dest = multiplayerExitDestination({ isClassroomMode: true, isHost: true, locale });
      expect(dest).not.toBeNull();
      expect(isBareHome(dest as string, locale)).toBe(false);
    });
  });
});
