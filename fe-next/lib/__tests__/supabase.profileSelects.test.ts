/**
 * Profile Selects Tests
 *
 * Verifies that all required fields are included in profile selectors.
 * Bug fix: gift_modal_dismissed_at was missing from PROFILE_SELECTS.full
 * which caused the gift modal to keep showing even after dismissal.
 */

import { PROFILE_SELECTS } from '../supabase';
import { isTeacherProfile } from '../education/teacherRole';

describe('PROFILE_SELECTS', () => {
  describe('full selector', () => {
    it('should include gift_modal_dismissed_at for gift modal auto-show logic', () => {
      // This field is required by Header.tsx to prevent auto-showing dismissed gifts
      // See: components/Header.tsx lines 124-137
      expect(PROFILE_SELECTS.full).toContain('gift_modal_dismissed_at');
    });

    it('should include player_style so the chosen style applies on load', () => {
      // Read by PlayerStyleContext (committed style → accent/music/avatar). When
      // omitted, fetchUserData wipes it on every auth refresh → style reverts to
      // default and nothing applies. Same class of bug as gift_modal_dismissed_at.
      expect(PROFILE_SELECTS.full).toContain('player_style');
    });

    it('should include player_style_modal_shown_at to suppress the one-time popup', () => {
      // Read by PlayerStyleOnboardingWrapper. When omitted, the gate sees null
      // every render → the style popup re-shows on every screen after dismissal.
      expect(PROFILE_SELECTS.full).toContain('player_style_modal_shown_at');
    });

    it('should include user_role — the whole teacher gate reads it', () => {
      // Omitted, `profile.user_role` is undefined for EVERY user, so
      // `isTeacherProfile()` is true only for is_admin accounts and every
      // approved teacher gets bounced off /teacher to /education/access. The
      // admin who tests it never sees the bug. Verified in a browser as a
      // non-admin teacher on 2026-08-29: cold-loading /en/teacher redirected.
      expect(PROFILE_SELECTS.full).toContain('user_role');
    });

    it('satisfies the teacher-role predicate with the row it actually fetches', () => {
      // The predicate and the selector are in different files; this is the seam
      // where they drifted. Fields are asserted against the predicate itself so
      // adding a third role source cannot silently outrun the fetch.
      const fetched = PROFILE_SELECTS.full.split(',').map((f) => f.trim());
      expect(isTeacherProfile({ user_role: 'teacher' })).toBe(true);
      for (const field of ['user_role', 'is_admin']) {
        expect(fetched, `isTeacherProfile reads ${field} but full never fetches it`).toContain(field);
      }
    });

    it('should include all essential profile fields', () => {
      const essentialFields = [
        'id',
        'username',
        'display_name',
        'total_coins',
        'total_xp',
        'is_admin',
      ];

      for (const field of essentialFields) {
        expect(PROFILE_SELECTS.full).toContain(field);
      }
    });
  });
});
