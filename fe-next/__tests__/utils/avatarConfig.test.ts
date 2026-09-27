/**
 * Avatar Configuration Test
 *
 * Tests avatar configuration utilities and validates that hardcoded colors
 * have been replaced with CSS variables from the design system.
 */

import {
  AVATARS,
  getAvatarById,
  getRandomAvatar,
  getAvatarPath,
  getAvatarEmojiAndColor,
  mapEmojiToAvatar,
} from '@/utils/avatarConfig';

describe('Avatar Configuration', () => {
  describe('AVATARS constant', () => {
    test('should have 17 avatars', () => {
      expect(AVATARS).toHaveLength(17);
    });

    test('each avatar should have id, name, and filename', () => {
      AVATARS.forEach(avatar => {
        expect(avatar).toHaveProperty('id');
        expect(avatar).toHaveProperty('name');
        expect(avatar).toHaveProperty('filename');
        expect(typeof avatar.id).toBe('string');
        expect(typeof avatar.name).toBe('string');
        expect(typeof avatar.filename).toBe('string');
      });
    });

    test('avatar IDs should match expected character names', () => {
      const expectedIds = [
        'broccoli-bob', 'drippy-drop', 'sunny-steve', 'cloudy-carl',
        'octo-otto', 'pizza-pete', 'prickly-pat', 'melon-molly',
        'avo-alex', 'frosty-frank', 'flaky-fred', 'eggy-ed',
        'slimy-sam', 'starry-stella', 'shroom-shelly', 'donut-danny',
        'jelly-jen',
      ];

      const actualIds = AVATARS.map(a => a.id);
      expectedIds.forEach(id => {
        expect(actualIds).toContain(id);
      });
    });

    test('avatar filenames should have .png extension', () => {
      AVATARS.forEach(avatar => {
        expect(avatar.filename).toMatch(/\.png$/);
      });
    });
  });

  describe('getAvatarById', () => {
    test('should return avatar for valid ID', () => {
      const avatar = getAvatarById('broccoli-bob');
      expect(avatar).toBeDefined();
      expect(avatar?.id).toBe('broccoli-bob');
      expect(avatar?.name).toBe('Broccoli Bob');
    });

    test('should return undefined for invalid ID', () => {
      const avatar = getAvatarById('non-existent');
      expect(avatar).toBeUndefined();
    });

    test('should work for all avatar IDs', () => {
      AVATARS.forEach(expectedAvatar => {
        const avatar = getAvatarById(expectedAvatar.id);
        expect(avatar).toEqual(expectedAvatar);
      });
    });
  });

  describe('getRandomAvatar', () => {
    test('should return an avatar', () => {
      const avatar = getRandomAvatar();
      expect(avatar).toBeDefined();
      expect(AVATARS).toContainEqual(avatar);
    });

    test('should return different avatars over multiple calls', () => {
      const avatars = new Set();
      // Generate 50 random avatars, should get at least 5 different ones
      for (let i = 0; i < 50; i++) {
        avatars.add(getRandomAvatar().id);
      }
      expect(avatars.size).toBeGreaterThan(5);
    });
  });

  describe('getAvatarPath', () => {
    test('should return path for avatar object', () => {
      const avatar = AVATARS[0];
      const path = getAvatarPath(avatar);
      expect(path).toBe(`/avatars/${avatar.filename}`);
    });

    test('should return path for avatar ID string', () => {
      const path = getAvatarPath('broccoli-bob');
      expect(path).toBe('/avatars/broccoli-bob.png');
    });

    test('should return path for filename string', () => {
      const path = getAvatarPath('custom-avatar.png');
      expect(path).toBe('/avatars/custom-avatar.png');
    });

    test('all avatar paths should start with /avatars/', () => {
      AVATARS.forEach(avatar => {
        const path = getAvatarPath(avatar);
        expect(path).toMatch(/^\/avatars\//);
      });
    });
  });

  describe('getAvatarEmojiAndColor', () => {
    test('should return emoji and color for valid avatar ID', () => {
      const result = getAvatarEmojiAndColor('broccoli-bob');
      expect(result).toHaveProperty('emoji');
      expect(result).toHaveProperty('color');
      expect(result.emoji).toBe('🥦');
      expect(result.color).toBe('#52B788');
    });

    test('should return hex colors for socket/database compatibility', () => {
      const avatarIds = [
        'broccoli-bob', 'drippy-drop', 'sunny-steve', 'cloudy-carl',
        'octo-otto', 'pizza-pete', 'prickly-pat', 'melon-molly',
        'avo-alex', 'frosty-frank', 'flaky-fred', 'eggy-ed',
        'slimy-sam', 'starry-stella', 'shroom-shelly', 'donut-danny',
        'jelly-jen',
      ];

      avatarIds.forEach(id => {
        const result = getAvatarEmojiAndColor(id);
        // Color should be a hex code for socket schema validation
        expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    test('should return valid hex colors that pass socket validation', () => {
      const avatarIds = [
        'broccoli-bob', 'drippy-drop', 'sunny-steve', 'cloudy-carl',
        'octo-otto', 'pizza-pete', 'prickly-pat', 'melon-molly',
        'avo-alex', 'frosty-frank', 'flaky-fred', 'eggy-ed',
        'slimy-sam', 'starry-stella', 'shroom-shelly', 'donut-danny',
        'jelly-jen',
      ];

      // Socket schema pattern: /^#[0-9A-Fa-f]{6}$/
      const socketColorPattern = /^#[0-9A-Fa-f]{6}$/;

      avatarIds.forEach(id => {
        const result = getAvatarEmojiAndColor(id);
        expect(result.color).toMatch(socketColorPattern);
      });
    });

    test('should return default emoji and color for unknown ID', () => {
      const result = getAvatarEmojiAndColor('unknown-avatar');
      expect(result.emoji).toBe('🎯');
      expect(result.color).toBe('#FF6B6B');
    });

    test('all avatars should have emojis', () => {
      AVATARS.forEach(avatar => {
        const result = getAvatarEmojiAndColor(avatar.id);
        expect(result.emoji).toBeTruthy();
        expect(result.emoji.length).toBeGreaterThan(0);
      });
    });
  });

  describe('mapEmojiToAvatar', () => {
    test('should map common emojis to avatars', () => {
      const result = mapEmojiToAvatar('🐶');
      expect(result).toBeDefined();
      expect(AVATARS).toContainEqual(result);
    });

    test('should return valid avatar for any mapped emoji', () => {
      const testEmojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊'];
      testEmojis.forEach(emoji => {
        const result = mapEmojiToAvatar(emoji);
        expect(AVATARS).toContainEqual(result);
      });
    });

    test('should return random avatar for unmapped emoji', () => {
      const result = mapEmojiToAvatar('🌟');
      expect(result).toBeDefined();
      expect(AVATARS).toContainEqual(result);
    });
  });

  describe('Avatar Color Integration', () => {
    test('avatar colors should be consistent with design system hex values', () => {
      // Test that avatar colors map to the correct hex values
      const colorMappings = {
        'broccoli-bob': '#52B788',  // --avatar-10
        'drippy-drop': '#4ECDC4',   // --avatar-2
        'sunny-steve': '#F8B739',   // --avatar-9
        'pizza-pete': '#FF6B6B',    // --avatar-1
      };

      Object.entries(colorMappings).forEach(([avatarId, expectedColor]) => {
        const result = getAvatarEmojiAndColor(avatarId);
        expect(result.color).toBe(expectedColor);
      });
    });

    test('no avatar should use deprecated hardcoded colors', () => {
      const deprecatedColors = [
        '#10b981', '#06b6d4', '#f59e0b', '#94a3b8', '#8b5cf6',
        '#ef4444', '#84cc16', '#ec4899', '#22c55e', '#60a5fa',
        '#e0f2fe', '#fef3c7', '#4ade80', '#fbbf24', '#f87171',
        '#fb923c', '#c084fc', '#6366f1',
      ];

      AVATARS.forEach(avatar => {
        const result = getAvatarEmojiAndColor(avatar.id);
        deprecatedColors.forEach(deprecatedColor => {
          expect(result.color).not.toBe(deprecatedColor);
        });
      });
    });
  });
});
