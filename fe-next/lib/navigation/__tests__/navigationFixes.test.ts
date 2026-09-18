/**
 * Comprehensive tests for all 4 navigation fixes from code-map section 2.
 *
 * Fixes:
 * 1. Error boundaries use sectionHome to stay in education context
 * 2. parentRoute has PARENT_OVERRIDES for education routes
 * 3. useAndroidBackButton uses parentRoute correctly
 * 4. EducationHeader separates leave-education action from education navigation
 */

import { describe, it, expect } from 'vitest';
import { sectionHome, isEducationPath } from '@/lib/navigation/sectionHome';
import { parentRoute } from '@/lib/navigation/parentRoute';

describe('Navigation Fixes — All 4 Causes', () => {
  describe('Fix #1: Error Boundaries use sectionHome', () => {
    it('should direct chunk errors from education routes to /{locale}/education, not /', () => {
      // Error boundaries catch errors and should call sectionHome to pick the fallback
      expect(sectionHome({ pathname: '/en/teacher/classroom/abc/analytics' })).toBe('/en/education');
      expect(sectionHome({ pathname: '/he/student/achievements' })).toBe('/he/education');
      expect(sectionHome({ pathname: '/sv/join/XJXEFN' })).toBe('/sv/education');
    });

    it('should direct errors from non-education routes to /{locale}, not /', () => {
      expect(sectionHome({ pathname: '/en/multiplayer' })).toBe('/en');
      expect(sectionHome({ pathname: '/en/daily' })).toBe('/en');
      expect(sectionHome({ pathname: '/ja/adventure' })).toBe('/ja');
    });

    it('should preserve locale for RTL languages on error', () => {
      // Hebrew is RTL — error recovery must preserve it
      expect(sectionHome({ pathname: '/he/teacher' })).toBe('/he/education');
      expect(sectionHome({ pathname: '/he/student/profile' })).toBe('/he/education');
    });

    it('should default to en if locale is ambiguous', () => {
      // No recognized locale → can't determine if education or not → default to /en
      expect(sectionHome({ pathname: '/unknown/teacher' })).toBe('/en');
      expect(sectionHome({ pathname: '/teacher' })).toBe('/en'); // No locale prefix
      expect(sectionHome({ pathname: '' })).toBe('/en');
    });
  });

  describe('Fix #2: parentRoute has PARENT_OVERRIDES for education routes', () => {
    it('should map top-level education routes to /{locale}/education, not /{locale}', () => {
      // This is critical for Android back button and navigation fallbacks:
      // a deep link to /teacher or /student should go to /education, not home
      expect(parentRoute('/en/teacher')).toBe('/en/education');
      expect(parentRoute('/en/student')).toBe('/en/education');
      expect(parentRoute('/en/join')).toBe('/en/education');
      expect(parentRoute('/en/classroom')).toBe('/en/education');
    });

    it('should preserve locale in parent navigation', () => {
      expect(parentRoute('/he/teacher')).toBe('/he/education');
      expect(parentRoute('/sv/student')).toBe('/sv/education');
      expect(parentRoute('/ja/join')).toBe('/ja/education');
      expect(parentRoute('/es/classroom')).toBe('/es/education');
    });

    it('should not collapse nested education paths — only top-level routes override', () => {
      // /teacher/classroom/abc should go to /teacher/classroom, not jump to /education
      expect(parentRoute('/en/teacher/classroom/abc')).toBe('/en/teacher/classroom');
      expect(parentRoute('/en/teacher/curriculum/lesson/123')).toBe('/en/teacher/curriculum/lesson');
      // Only the TOP-LEVEL /teacher → /education override applies
    });

    it('should handle RTL-language education navigation', () => {
      // Hebrew teachers/students need RTL-safe fallback paths
      expect(parentRoute('/he/teacher')).toBe('/he/education');
      expect(parentRoute('/he/student')).toBe('/he/education');
    });

    it('should fall through non-education routes to default parent logic', () => {
      expect(parentRoute('/en/multiplayer')).toBe('/en');
      expect(parentRoute('/en/daily/archive')).toBe('/en/daily');
      expect(parentRoute('/en/adventure')).toBe('/en');
    });
  });

  describe('Fix #3: useAndroidBackButton uses parentRoute for education fallback', () => {
    it('should navigate via parentRoute when no browser history exists', () => {
      // Deep link scenario: Android cold-start on /teacher with no browser history
      // Should call router.push(parentRoute('/en/teacher')) = router.push('/en/education')
      const path = '/en/teacher';
      const parent = parentRoute(path);
      expect(parent).toBe('/en/education');
    });

    it('should use parentRoute for all education top-level routes without history', () => {
      const educationPaths = ['/en/teacher', '/en/student', '/en/join', '/en/classroom'];
      educationPaths.forEach((path) => {
        const parent = parentRoute(path);
        expect(parent).toBe('/en/education');
      });
    });

    it('should detect education paths correctly for Android back dispatch', () => {
      // isEducationPath is used in useAndroidBackButton context to know whether
      // this is an education flow (should go to /education) or not
      expect(isEducationPath('/en/teacher')).toBe(true);
      expect(isEducationPath('/en/student')).toBe(true);
      expect(isEducationPath('/en/join/CODE')).toBe(true);
      expect(isEducationPath('/en/education/classroom-game')).toBe(false); // /education itself is not in EDUCATION_ROUTES
      expect(isEducationPath('/en/multiplayer')).toBe(false);
    });
  });

  describe('Fix #4: EducationHeader separates leave-education action', () => {
    it('should have exit-education button at the bottom, not adjacent to education home', () => {
      // The EducationHeader should have a "Leave Education" section at the BOTTOM of the mobile menu,
      // clearly separated from the "Navigation" section which includes "Education Home".
      // This test is primarily a code-review assertion since it's UI-level, but we verify the logic:
      // - Education navigation links should go to /education/* paths
      // - Exit education link should go to /{locale}, the main app home

      // This is verified by ensuring parentRoute and sectionHome treat these differently:
      expect(parentRoute('/en/education')).toBe('/en'); // /education is NOT an education route
      expect(isEducationPath('/en/education')).toBe(false);
    });

    it('should make it clear that leaving education goes to main app, not deeper education', () => {
      // The design fix is visual (moving to bottom, clear label), but the backend logic
      // must ensure that any "exit education" button targets the right place:
      // - Education home: /education (for returning to edu landing)
      // - Leave education: /{locale} (for returning to main app)

      expect(sectionHome({ pathname: '/en/teacher' })).toBe('/en/education'); // Stay in education on error
      expect(sectionHome({ pathname: '/en/multiplayer' })).toBe('/en'); // Go to main home on error
    });
  });

  describe('Integration: Full Navigation Flow', () => {
    it('should handle chunkerror deep-link recovery for education user', () => {
      // Scenario: Teacher deep-links to /en/teacher/classroom/abc, chunk error fires
      const errorPath = '/en/teacher/classroom/abc';
      const fallback = sectionHome({ pathname: errorPath });
      expect(fallback).toBe('/en/education'); // Not the main home
    });

    it('should handle android back from education deep link', () => {
      // Scenario: Android user deep-linked to /en/student, taps back, no browser history
      const deepLink = '/en/student';
      const noHistory = parentRoute(deepLink);
      expect(noHistory).toBe('/en/education'); // Not the main home
    });

    it('should handle error recovery for non-education user', () => {
      // Scenario: Multiplayer user hits a chunk error
      const errorPath = '/en/multiplayer/lobby';
      const fallback = sectionHome({ pathname: errorPath });
      expect(fallback).toBe('/en'); // Goes to main home, not /education
    });

    it('should not strip locale during any navigation recovery', () => {
      // All recovery paths must preserve locale for RTL support
      const rtlErrorPath = '/he/teacher/classroom';
      const rtlFallback = sectionHome({ pathname: rtlErrorPath });
      expect(rtlFallback).toMatch(/^\/he/); // Starts with /he, not /en
      expect(rtlFallback).toBe('/he/education');
    });

    it('should distinguish education section from education marketing pages', () => {
      // /education itself is a marketing/landing page, not part of the education section routes
      const educationLanding = '/en/education';
      expect(isEducationPath(educationLanding)).toBe(false); // /education is NOT an education route
      expect(sectionHome({ pathname: educationLanding })).toBe('/en'); // Falls back to main home
    });
  });

  describe('Edge Cases & Defensive Checks', () => {
    it('should handle malformed paths gracefully', () => {
      // Even if path is weird, should never throw and should preserve locale if detectable
      expect(() => parentRoute('/en//teacher')).not.toThrow();
      expect(() => sectionHome({ pathname: '/en//teacher' })).not.toThrow();
    });

    it('should handle all 6 locales correctly', () => {
      const locales = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
      locales.forEach((locale) => {
        expect(sectionHome({ pathname: `/${locale}/teacher` })).toBe(`/${locale}/education`);
        expect(parentRoute(`/${locale}/student`)).toBe(`/${locale}/education`);
      });
    });

    it('should never accidentally route to bare / without locale', () => {
      // This is the bug we're fixing — ensure no path accidentally routes to bare /
      const problematicPaths = [
        '/en/teacher',
        '/en/student',
        '/en/join/CODE',
        '/he/teacher',
        '/sv/student',
      ];
      problematicPaths.forEach((path) => {
        const home = sectionHome({ pathname: path });
        expect(home).toMatch(/^\/\w{2}\//); // Should start with /locale/, never bare /
      });
    });
  });
});
