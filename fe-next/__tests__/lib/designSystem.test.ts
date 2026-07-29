/**
 * Design System Utilities Test
 *
 * Tests all 10 helper functions from /lib/designSystem.ts
 * Validates color migration utilities, OAuth/share brand colors, avatar colors,
 * rank/stat gradients, semantic utilities, and validation functions.
 */

import {
  getOAuthBrandColor,
  getOAuthBrandColorVar,
  getShareBrandColor,
  getShareBrandColorVar,
  getAvatarColor,
  getAvatarColorVar,
  getAvatarColorHex,
  getRankGradient,
  getStatGradient,
  getButtonTokenClass,
  getBadgeTokenClass,
  isHardcodedColor,
  suggestDesignToken,
  type AvatarCharacter,
} from '@/lib/designSystem';

describe('OAuth Brand Colors', () => {
  describe('getOAuthBrandColor', () => {
    test('should return correct Google brand colors', () => {
      expect(getOAuthBrandColor('google')).toBe('brand-google');
      expect(getOAuthBrandColor('google', 'hover')).toBe('brand-google-hover');
      expect(getOAuthBrandColor('google', 'dark')).toBe('brand-google-dark');
    });

    test('should return correct Discord brand colors', () => {
      expect(getOAuthBrandColor('discord')).toBe('brand-discord');
      expect(getOAuthBrandColor('discord', 'hover')).toBe('brand-discord-hover');
      expect(getOAuthBrandColor('discord', 'dark')).toBe('brand-discord-dark');
    });

    test('should return correct Apple brand colors', () => {
      expect(getOAuthBrandColor('apple')).toBe('brand-apple');
      expect(getOAuthBrandColor('apple', 'hover')).toBe('brand-apple-hover');
      expect(getOAuthBrandColor('apple', 'dark')).toBe('brand-apple-light');
    });

    test('should default to "default" state when not specified', () => {
      expect(getOAuthBrandColor('google')).toBe('brand-google');
    });
  });

  describe('getOAuthBrandColorVar', () => {
    test('should return CSS variable for Google', () => {
      expect(getOAuthBrandColorVar('google')).toBe('var(--brand-google)');
      expect(getOAuthBrandColorVar('google', 'hover')).toBe('var(--brand-google-hover)');
    });

    test('should return CSS variable for Discord', () => {
      expect(getOAuthBrandColorVar('discord')).toBe('var(--brand-discord)');
    });

    test('should return CSS variable for Apple', () => {
      expect(getOAuthBrandColorVar('apple')).toBe('var(--brand-apple)');
    });
  });
});

describe('Social Share Brand Colors', () => {
  describe('getShareBrandColor', () => {
    test('should return correct share platform colors', () => {
      expect(getShareBrandColor('whatsapp')).toBe('brand-whatsapp');
      expect(getShareBrandColor('facebook')).toBe('brand-facebook');
      expect(getShareBrandColor('twitter')).toBe('brand-twitter');
      expect(getShareBrandColor('linkedin')).toBe('brand-linkedin');
    });
  });

  describe('getShareBrandColorVar', () => {
    test('should return CSS variables for share platforms', () => {
      expect(getShareBrandColorVar('whatsapp')).toBe('var(--brand-whatsapp)');
      expect(getShareBrandColorVar('facebook')).toBe('var(--brand-facebook)');
      expect(getShareBrandColorVar('twitter')).toBe('var(--brand-twitter)');
      expect(getShareBrandColorVar('linkedin')).toBe('var(--brand-linkedin)');
    });
  });
});

describe('Avatar Colors', () => {
  describe('getAvatarColor', () => {
    test('should return Tailwind class for avatar characters', () => {
      expect(getAvatarColor('broccoli-bob')).toBe('bg-avatar-10');
      expect(getAvatarColor('drippy-drop')).toBe('bg-avatar-2');
      expect(getAvatarColor('sunny-steve')).toBe('bg-avatar-9');
      expect(getAvatarColor('pizza-pete')).toBe('bg-avatar-1');
    });

    test('should handle all 17 avatar characters', () => {
      const avatars: Array<Parameters<typeof getAvatarColor>[0]> = [
        'broccoli-bob', 'drippy-drop', 'sunny-steve', 'cloudy-carl',
        'octo-otto', 'pizza-pete', 'prickly-pat', 'melon-molly',
        'avo-alex', 'frosty-frank', 'flaky-fred', 'eggy-ed',
        'slimy-sam', 'starry-stella', 'shroom-shelly', 'donut-danny',
        'jelly-jen',
      ];

      avatars.forEach(avatar => {
        const result = getAvatarColor(avatar);
        expect(result).toMatch(/^bg-avatar-\d+$/);
      });
    });

    test('should return default fallback for unknown avatar', () => {
      // @ts-expect-error Testing invalid input
      expect(getAvatarColor('unknown-avatar')).toBe('bg-avatar-1');
    });
  });

  describe('getAvatarColorVar', () => {
    test('should return CSS variable for avatar characters', () => {
      expect(getAvatarColorVar('broccoli-bob')).toBe('var(--avatar-10)');
      expect(getAvatarColorVar('drippy-drop')).toBe('var(--avatar-2)');
      expect(getAvatarColorVar('sunny-steve')).toBe('var(--avatar-9)');
    });

    test('should return CSS variable format for all avatars', () => {
      const result = getAvatarColorVar('pizza-pete');
      expect(result).toMatch(/^var\(--avatar-\d+\)$/);
    });
  });

  describe('getAvatarColorHex', () => {
    test('should return hex color for avatar characters', () => {
      expect(getAvatarColorHex('broccoli-bob')).toBe('#52B788');
      expect(getAvatarColorHex('drippy-drop')).toBe('#4ECDC4');
      expect(getAvatarColorHex('sunny-steve')).toBe('#F8B739');
      expect(getAvatarColorHex('pizza-pete')).toBe('#FF6B6B');
    });

    test('should return hex color format for all avatars', () => {
      const avatars: AvatarCharacter[] = [
        'broccoli-bob', 'drippy-drop', 'sunny-steve', 'cloudy-carl',
        'octo-otto', 'pizza-pete', 'prickly-pat', 'melon-molly',
        'avo-alex', 'frosty-frank', 'flaky-fred', 'eggy-ed',
        'slimy-sam', 'starry-stella', 'shroom-shelly', 'donut-danny',
        'jelly-jen',
      ];

      avatars.forEach(avatar => {
        const result = getAvatarColorHex(avatar);
        // Should be a valid hex color matching socket schema: /^#[0-9A-Fa-f]{6}$/
        expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    test('should return default hex fallback for unknown avatar', () => {
      // @ts-expect-error Testing invalid input
      expect(getAvatarColorHex('unknown-avatar')).toBe('#FF6B6B');
    });
  });
});

describe('Rank Gradients', () => {
  describe('getRankGradient', () => {
    test('should return correct gradient classes for ranks', () => {
      expect(getRankGradient(1)).toBe('bg-gradient-rank-first');
      expect(getRankGradient(2)).toBe('bg-gradient-rank-second');
      expect(getRankGradient(3)).toBe('bg-gradient-rank-third');
    });

    test('should default to third place for invalid rank', () => {
      // @ts-expect-error Testing invalid input
      expect(getRankGradient(4)).toBe('bg-gradient-rank-third');
      // @ts-expect-error Testing invalid input
      expect(getRankGradient(0)).toBe('bg-gradient-rank-third');
    });
  });
});

describe('Stat Gradients', () => {
  describe('getStatGradient', () => {
    test('should return correct gradient classes for stat types', () => {
      expect(getStatGradient('positive')).toBe('bg-gradient-stat-positive');
      expect(getStatGradient('negative')).toBe('bg-gradient-stat-negative');
      expect(getStatGradient('neutral')).toBe('bg-gradient-stat-neutral');
    });
  });
});

describe('Semantic Button Utilities', () => {
  describe('getButtonTokenClass', () => {
    test('should return correct button utility classes', () => {
      expect(getButtonTokenClass('primary')).toBe('btn-token-primary');
      expect(getButtonTokenClass('secondary')).toBe('btn-token-secondary');
      expect(getButtonTokenClass('destructive')).toBe('btn-token-destructive');
      expect(getButtonTokenClass('success')).toBe('btn-token-success');
    });
  });
});

describe('Semantic Badge Utilities', () => {
  describe('getBadgeTokenClass', () => {
    test('should return correct badge utility classes', () => {
      expect(getBadgeTokenClass('info')).toBe('badge-token-info');
      expect(getBadgeTokenClass('warning')).toBe('badge-token-warning');
      expect(getBadgeTokenClass('error')).toBe('badge-token-error');
      expect(getBadgeTokenClass('success')).toBe('badge-token-success');
    });
  });
});

describe('Color Validation', () => {
  describe('isHardcodedColor', () => {
    test('should detect hex colors', () => {
      expect(isHardcodedColor('#FFE135')).toBe(true);
      expect(isHardcodedColor('#FFF')).toBe(true);
      expect(isHardcodedColor('#00FFFF')).toBe(true);
    });

    test('should detect RGB colors', () => {
      expect(isHardcodedColor('rgb(255, 225, 53)')).toBe(true);
      expect(isHardcodedColor('rgba(255, 225, 53, 0.5)')).toBe(true);
    });

    test('should detect HSL colors', () => {
      expect(isHardcodedColor('hsl(200, 50%, 50%)')).toBe(true);
      expect(isHardcodedColor('hsla(200, 50%, 50%, 0.5)')).toBe(true);
    });

    test('should NOT detect CSS variables', () => {
      expect(isHardcodedColor('var(--neo-yellow)')).toBe(false);
      expect(isHardcodedColor('var(--brand-google)')).toBe(false);
    });

    test('should NOT detect Tailwind classes', () => {
      expect(isHardcodedColor('bg-neo-yellow')).toBe(false);
      expect(isHardcodedColor('text-brand-google')).toBe(false);
    });

    test('should handle empty or invalid input', () => {
      expect(isHardcodedColor('')).toBe(false);
      expect(isHardcodedColor('not-a-color')).toBe(false);
    });
  });
});

describe('Design Token Suggestions', () => {
  describe('suggestDesignToken', () => {
    test('should suggest tokens for Neo-Brutalist palette', () => {
      expect(suggestDesignToken('#FFE135')).toBe('neo-yellow');
      expect(suggestDesignToken('#FF1493')).toBe('neo-pink');
      expect(suggestDesignToken('#00FFFF')).toBe('neo-cyan');
      expect(suggestDesignToken('#FF3366')).toBe('neo-red');
      expect(suggestDesignToken('#BFFF00')).toBe('neo-lime');
    });

    test('should suggest tokens for brand colors', () => {
      expect(suggestDesignToken('#4285F4')).toBe('brand-google');
      expect(suggestDesignToken('#5865F2')).toBe('brand-discord');
      expect(suggestDesignToken('#25D366')).toBe('brand-whatsapp');
      expect(suggestDesignToken('#1877F2')).toBe('brand-facebook');
    });

    test('should be case insensitive', () => {
      expect(suggestDesignToken('#ffe135')).toBe('neo-yellow');
      expect(suggestDesignToken('#FFE135')).toBe('neo-yellow');
    });

    test('should handle RGB format', () => {
      // RGB for #4285F4 (Google blue)
      expect(suggestDesignToken('rgb(66, 133, 244)')).toBe('brand-google');
    });

    test('should suggest deprecated tokens with warning', () => {
      expect(suggestDesignToken('#FF6B35')).toContain('neo-orange');
      expect(suggestDesignToken('#FF6B35')).toContain('DEPRECATED');
    });

    test('should return null for unknown colors', () => {
      expect(suggestDesignToken('#123456')).toBeNull();
      expect(suggestDesignToken('rgb(1, 2, 3)')).toBeNull();
    });

    test('should handle empty or invalid input', () => {
      expect(suggestDesignToken('')).toBeNull();
    });
  });
});

describe('Integration Tests', () => {
  test('OAuth color functions should be consistent', () => {
    const className = getOAuthBrandColor('google');
    const cssVar = getOAuthBrandColorVar('google');

    expect(className).toBe('brand-google');
    expect(cssVar).toBe('var(--brand-google)');
  });

  test('Avatar color functions should be consistent', () => {
    const tailwindClass = getAvatarColor('broccoli-bob');
    const cssVar = getAvatarColorVar('broccoli-bob');

    expect(tailwindClass).toBe('bg-avatar-10');
    expect(cssVar).toBe('var(--avatar-10)');
  });

  test('Hardcoded color should trigger token suggestion', () => {
    const hardcodedColor = '#FFE135';
    expect(isHardcodedColor(hardcodedColor)).toBe(true);
    expect(suggestDesignToken(hardcodedColor)).toBe('neo-yellow');
  });
});
