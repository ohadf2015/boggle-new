/**
 * Profile Selects Tests
 *
 * Verifies that all required fields are included in profile selectors.
 * Bug fix: gift_modal_dismissed_at was missing from PROFILE_SELECTS.full
 * which caused the gift modal to keep showing even after dismissal.
 */

import { PROFILE_SELECTS } from '../supabase';

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
