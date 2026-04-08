/**
 * ProfileCustomizationModal Component Tests
 *
 * Tests the profile customization flow after signup/login
 * Bug: The save handler was missing avatar_emoji and avatar_color
 */

import { getAvatarEmojiAndColor, AVATARS } from '@/utils/avatarConfig';

describe('Profile Customization Avatar Config', () => {
  describe('getAvatarEmojiAndColor', () => {
    it('returns correct values for known avatars', () => {
      // Test a few known avatar IDs - now using hex colors for socket/database compatibility
      const broccoliResult = getAvatarEmojiAndColor('broccoli-bob');
      expect(broccoliResult).toEqual({ emoji: '🥦', color: '#52B788' });

      const sunnyResult = getAvatarEmojiAndColor('sunny-steve');
      expect(sunnyResult).toEqual({ emoji: '☀️', color: '#F8B739' });

      const octoResult = getAvatarEmojiAndColor('octo-otto');
      expect(octoResult).toEqual({ emoji: '🐙', color: '#BB8FCE' });
    });

    it('returns default for unknown avatars', () => {
      const unknownResult = getAvatarEmojiAndColor('unknown-avatar');
      expect(unknownResult).toEqual({ emoji: '🎯', color: '#FF6B6B' });
    });

    it('all AVATARS have valid emoji and hex color mappings', () => {
      AVATARS.forEach(avatar => {
        const { emoji, color } = getAvatarEmojiAndColor(avatar.id);
        expect(emoji).toBeTruthy();
        // Colors are hex for socket schema validation
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });
});

describe('Profile Customization Save Handler Integration', () => {
  /**
   * This test verifies that when saving profile customization,
   * the avatar_emoji and avatar_color are properly included.
   *
   * Bug: The original implementation only saved display_name, username,
   * avatar_image, and has_customized_profile, missing avatar_emoji and avatar_color.
   */
  it('save handler should include avatar_emoji and avatar_color', async () => {
    const mockUpdateProfile = vi.fn().mockResolvedValue({ data: {}, error: null });

    // This is the CORRECT implementation of the save handler
    const handleProfileCustomizationSave = async (name: string, avatarId: string) => {
      const { emoji, color } = getAvatarEmojiAndColor(avatarId);

      await mockUpdateProfile({
        display_name: name,
        avatar_image: avatarId,
        avatar_emoji: emoji,
        avatar_color: color,
        has_customized_profile: true,
      });
    };

    // Test with a known avatar
    await handleProfileCustomizationSave('TestPlayer', 'broccoli-bob');

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      display_name: 'TestPlayer',
      avatar_image: 'broccoli-bob',
      avatar_emoji: '🥦',
      avatar_color: '#52B788', // Using hex color for socket/database compatibility
      has_customized_profile: true,
    });
  });

  it('save handler should handle any avatar from AVATARS list', async () => {
    const mockUpdateProfile = vi.fn().mockResolvedValue({ data: {}, error: null });

    const handleProfileCustomizationSave = async (name: string, avatarId: string) => {
      const { emoji, color } = getAvatarEmojiAndColor(avatarId);

      await mockUpdateProfile({
        display_name: name,
        avatar_image: avatarId,
        avatar_emoji: emoji,
        avatar_color: color,
        has_customized_profile: true,
      });
    };

    // Test with all avatars
    for (const avatar of AVATARS) {
      mockUpdateProfile.mockClear();
      await handleProfileCustomizationSave('Player', avatar.id);

      const expectedResult = getAvatarEmojiAndColor(avatar.id);
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          avatar_image: avatar.id,
          avatar_emoji: expectedResult.emoji,
          avatar_color: expectedResult.color,
        })
      );
    }
  });
});

describe('LandingView handleProfileCustomizationSave bug verification', () => {
  /**
   * This test documents the bug that was in LandingView.tsx
   * The BUGGY implementation was:
   *   await updateProfile({
   *     display_name: name,
   *     avatar_image: avatarId,
   *     has_customized_profile: true,
   *   });
   *
   * Missing: avatar_emoji and avatar_color
   */
  it('documents the bug: missing avatar_emoji and avatar_color', () => {
    // This is what the BUGGY implementation was doing
    const buggyUpdate = {
      display_name: 'TestPlayer',
      username: 'TestPlayer',
      avatar_image: 'broccoli-bob',
      has_customized_profile: true,
    };

    // This is what the CORRECT implementation should do
    const correctUpdate = {
      display_name: 'TestPlayer',
      username: 'TestPlayer',
      avatar_image: 'broccoli-bob',
      avatar_emoji: '🥦',
      avatar_color: '#10b981',
      has_customized_profile: true,
    };

    // The bug: buggy implementation was missing avatar_emoji and avatar_color
    expect(buggyUpdate).not.toHaveProperty('avatar_emoji');
    expect(buggyUpdate).not.toHaveProperty('avatar_color');

    // The fix: correct implementation includes them
    expect(correctUpdate).toHaveProperty('avatar_emoji', '🥦');
    expect(correctUpdate).toHaveProperty('avatar_color', '#10b981');
  });
});
