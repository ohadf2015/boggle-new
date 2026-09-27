import { describe, it, expect } from 'vitest';
import { sectionHome, isEducationPath } from '@/lib/navigation/sectionHome';

describe('sectionHome', () => {
  describe('isEducationPath', () => {
    it('returns true for education routes', () => {
      expect(isEducationPath('/en/teacher')).toBe(true);
      expect(isEducationPath('/en/teacher/classroom')).toBe(true);
      expect(isEducationPath('/en/teacher/classroom/abc/analytics')).toBe(true);
      expect(isEducationPath('/en/student')).toBe(true);
      expect(isEducationPath('/en/student/join')).toBe(true);
      expect(isEducationPath('/en/join/ABC123')).toBe(true);
      expect(isEducationPath('/en/classroom')).toBe(true);
    });

    it('returns false for non-education routes', () => {
      expect(isEducationPath('/en/multiplayer')).toBe(false);
      expect(isEducationPath('/en/daily')).toBe(false);
      expect(isEducationPath('/en/adventure')).toBe(false);
      expect(isEducationPath('/en/education')).toBe(false);
      expect(isEducationPath('/multiplayer')).toBe(false);
    });

    it('returns true for functional /education/* flow sub-routes (not marketing)', () => {
      // These are real gameplay/tool flows nested under /education, not SEO
      // landing pages. A teacher/student mid-flow here must stay in education
      // on error, not bounce to the main app home.
      expect(isEducationPath('/en/education/classroom-game')).toBe(true);
      expect(isEducationPath('/en/education/duels')).toBe(true);
      expect(isEducationPath('/en/education/duels/abc123')).toBe(true);
      expect(isEducationPath('/en/education/access')).toBe(true);
      expect(isEducationPath('/en/education/miss-gap-assignment')).toBe(true);
      expect(isEducationPath('/en/education/miss-gap-grade-passback')).toBe(true);
      expect(isEducationPath('/en/education/miss-gap-practice')).toBe(true);
      expect(isEducationPath('/en/education/miss-gap-whatsapp')).toBe(true);
      expect(isEducationPath('/en/education/unplugged-grade-passback')).toBe(true);
      expect(isEducationPath('/en/education/unplugged-reteach')).toBe(true);
    });

    it('returns false for /education marketing/SEO landing pages', () => {
      // The bare /education landing and its SEO content siblings stay outside
      // isEducationPath — they're marketing pages, not a stateful flow.
      expect(isEducationPath('/en/education')).toBe(false);
      expect(isEducationPath('/en/education/esl-word-games')).toBe(false);
      expect(isEducationPath('/en/education/vocabulary-games-classroom')).toBe(false);
    });

    it('returns false for empty or invalid paths', () => {
      expect(isEducationPath('')).toBe(false);
      expect(isEducationPath('/')).toBe(false);
    });

    it('works with all supported locales', () => {
      expect(isEducationPath('/he/teacher')).toBe(true);
      expect(isEducationPath('/sv/student')).toBe(true);
      expect(isEducationPath('/ja/join/ABC')).toBe(true);
      expect(isEducationPath('/es/classroom')).toBe(true);
      expect(isEducationPath('/ru/teacher/classroom')).toBe(true);
    });

    it('returns false when locale is not recognized or missing', () => {
      // Without a recognized locale, we can't reliably determine if a path
      // like /teacher is meant to be an education route or not. Be conservative.
      expect(isEducationPath('/xy/teacher')).toBe(false);
      expect(isEducationPath('/teacher')).toBe(false);
      expect(isEducationPath('/random/student')).toBe(false);
    });

    it('ignores query parameters', () => {
      expect(isEducationPath('/en/teacher?id=123')).toBe(true);
      expect(isEducationPath('/en/multiplayer?classroom=true')).toBe(false);
    });
  });

  describe('sectionHome', () => {
    describe('education routes', () => {
      it('returns /locale/education for teacher routes', () => {
        expect(sectionHome({ pathname: '/en/teacher' })).toBe('/en/education');
        expect(sectionHome({ pathname: '/en/teacher/classroom' })).toBe('/en/education');
        expect(sectionHome({ pathname: '/en/teacher/classroom/abc/analytics' })).toBe('/en/education');
      });

      it('returns /locale/education for student routes', () => {
        expect(sectionHome({ pathname: '/en/student' })).toBe('/en/education');
        expect(sectionHome({ pathname: '/en/student/join' })).toBe('/en/education');
        expect(sectionHome({ pathname: '/en/student/achievements' })).toBe('/en/education');
      });

      it('returns /locale/education for join routes', () => {
        expect(sectionHome({ pathname: '/en/join/ABC123' })).toBe('/en/education');
      });

      it('returns /locale/education for classroom routes', () => {
        expect(sectionHome({ pathname: '/en/classroom' })).toBe('/en/education');
      });

      it('returns /locale/education for functional /education/* flow sub-routes', () => {
        expect(sectionHome({ pathname: '/en/education/classroom-game' })).toBe('/en/education');
        expect(sectionHome({ pathname: '/en/education/duels/abc123' })).toBe('/en/education');
        expect(sectionHome({ pathname: '/en/education/access' })).toBe('/en/education');
        expect(sectionHome({ pathname: '/en/education/miss-gap-whatsapp' })).toBe('/en/education');
        expect(sectionHome({ pathname: '/en/education/unplugged-reteach' })).toBe('/en/education');
      });

      it('preserves locale for education routes', () => {
        expect(sectionHome({ pathname: '/he/teacher' })).toBe('/he/education');
        expect(sectionHome({ pathname: '/sv/student' })).toBe('/sv/education');
        expect(sectionHome({ pathname: '/ja/join/X7E4PY' })).toBe('/ja/education');
        expect(sectionHome({ pathname: '/es/classroom' })).toBe('/es/education');
        expect(sectionHome({ pathname: '/ru/teacher/classroom' })).toBe('/ru/education');
      });
    });

    describe('non-education routes', () => {
      it('returns /locale/ for main app routes', () => {
        expect(sectionHome({ pathname: '/en/multiplayer' })).toBe('/en');
        expect(sectionHome({ pathname: '/en/daily' })).toBe('/en');
        expect(sectionHome({ pathname: '/en/adventure' })).toBe('/en');
      });

      it('returns /locale/ for nested main app routes', () => {
        expect(sectionHome({ pathname: '/en/multiplayer/lobby' })).toBe('/en');
        expect(sectionHome({ pathname: '/en/daily/archive' })).toBe('/en');
      });

      it('returns /locale/ for /education routes themselves', () => {
        expect(sectionHome({ pathname: '/en/education' })).toBe('/en');
        expect(sectionHome({ pathname: '/en/education/landing' })).toBe('/en');
      });

      it('preserves locale for non-education routes', () => {
        expect(sectionHome({ pathname: '/he/multiplayer' })).toBe('/he');
        expect(sectionHome({ pathname: '/sv/daily' })).toBe('/sv');
        expect(sectionHome({ pathname: '/ru/adventure' })).toBe('/ru');
      });
    });

    describe('edge cases and defaults', () => {
      it('defaults to "en" for unrecognized locale or missing locale', () => {
        // Without a recognized locale, we can't determine if a path is education,
        // so we treat it as a general path and default to /en (not /en/education)
        expect(sectionHome({ pathname: '/xy/teacher' })).toBe('/en');
        expect(sectionHome({ pathname: '/unknown/multiplayer' })).toBe('/en');
        expect(sectionHome({ pathname: '/teacher' })).toBe('/en');
      });

      it('defaults to "en" for empty pathname', () => {
        expect(sectionHome({ pathname: '' })).toBe('/en');
      });

      it('respects explicit locale override', () => {
        expect(sectionHome({ pathname: '/en/teacher', locale: 'he' })).toBe('/he/education');
        expect(sectionHome({ pathname: '/en/multiplayer', locale: 'sv' })).toBe('/sv');
      });

      it('ignores query parameters', () => {
        expect(sectionHome({ pathname: '/en/teacher?id=123' })).toBe('/en/education');
        expect(sectionHome({ pathname: '/en/multiplayer?classroom=true' })).toBe('/en');
      });

      it('handles trailing slashes', () => {
        expect(sectionHome({ pathname: '/en/teacher/' })).toBe('/en/education');
        expect(sectionHome({ pathname: '/en/multiplayer/' })).toBe('/en');
      });
    });

    describe('multiplayer classroom rooms (via explicit `search`)', () => {
      it('sends the host to the teacher hub, not home, on a classroom multiplayer error', () => {
        expect(
          sectionHome({ pathname: '/en/multiplayer', search: '?room=ABCD&classroom=true&host=true' }),
        ).toBe('/en/teacher');
      });

      it('sends a classroom student to the student hub, not home', () => {
        expect(
          sectionHome({ pathname: '/en/multiplayer', search: '?room=ABCD&classroom=true' }),
        ).toBe('/en/student');
      });

      it('ignores `search` for an ordinary (non-classroom) multiplayer room', () => {
        expect(sectionHome({ pathname: '/en/multiplayer', search: '?room=ABCD' })).toBe('/en');
      });

      it('ignores classroom `search` on a non-multiplayer path', () => {
        expect(sectionHome({ pathname: '/en/daily', search: '?classroom=true&host=true' })).toBe('/en');
      });

      it('preserves locale for RTL classroom rooms via `search`', () => {
        expect(
          sectionHome({ pathname: '/he/multiplayer', search: '?classroom=true&host=true' }),
        ).toBe('/he/teacher');
      });

      it('does NOT read classroom context out of the pathname query string itself', () => {
        // Backward compatible: without an explicit `search`, a `?classroom=true`
        // embedded in `pathname` is still ignored, same as before this fix.
        expect(sectionHome({ pathname: '/en/multiplayer?classroom=true&host=true' })).toBe('/en');
      });
    });
  });
});
