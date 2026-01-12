/**
 * Tailwind Config Test
 *
 * Validates that Tailwind configuration includes all new design token utilities
 * Tests Phase 2 Tailwind extension for brand colors, gradients, and semantic plugins.
 */

import tailwindConfig from '../../tailwind.config';

type ColorObject = Record<string, string>;
type BackgroundImageObject = Record<string, string>;
type BoxShadowObject = Record<string, string | string[]>;

describe('Tailwind Configuration - Brand Colors', () => {
  const colors = tailwindConfig.theme?.extend?.colors;
  const brandColors = (typeof colors === 'function' ? undefined : colors?.brand) as ColorObject | undefined;

  test('Brand colors should be defined', () => {
    expect(brandColors).toBeDefined();
  });

  test('Google brand colors should reference CSS variables', () => {
    expect(brandColors?.google).toBe('var(--brand-google)');
    expect(brandColors?.['google-hover']).toBe('var(--brand-google-hover)');
    expect(brandColors?.['google-dark']).toBe('var(--brand-google-dark)');
  });

  test('Discord brand colors should reference CSS variables', () => {
    expect(brandColors?.discord).toBe('var(--brand-discord)');
    expect(brandColors?.['discord-hover']).toBe('var(--brand-discord-hover)');
    expect(brandColors?.['discord-dark']).toBe('var(--brand-discord-dark)');
  });

  test('Apple brand colors should reference CSS variables', () => {
    expect(brandColors?.apple).toBe('var(--brand-apple)');
    expect(brandColors?.['apple-hover']).toBe('var(--brand-apple-hover)');
    expect(brandColors?.['apple-light']).toBe('var(--brand-apple-light)');
  });

  test('WhatsApp brand colors should reference CSS variables', () => {
    expect(brandColors?.whatsapp).toBe('var(--brand-whatsapp)');
    expect(brandColors?.['whatsapp-hover']).toBe('var(--brand-whatsapp-hover)');
    expect(brandColors?.['whatsapp-dark']).toBe('var(--brand-whatsapp-dark)');
  });

  test('Social media brand colors should reference CSS variables', () => {
    expect(brandColors?.facebook).toBe('var(--brand-facebook)');
    expect(brandColors?.twitter).toBe('var(--brand-twitter)');
    expect(brandColors?.linkedin).toBe('var(--brand-linkedin)');
  });

  test('All 21 brand color utilities should be defined', () => {
    const expectedBrandColors = [
      'google', 'google-hover', 'google-dark',
      'discord', 'discord-hover', 'discord-dark',
      'apple', 'apple-hover', 'apple-light',
      'whatsapp', 'whatsapp-hover', 'whatsapp-dark',
      'facebook', 'facebook-hover', 'facebook-dark',
      'twitter', 'twitter-hover', 'twitter-dark',
      'linkedin', 'linkedin-hover', 'linkedin-dark',
    ];

    expectedBrandColors.forEach(color => {
      expect(brandColors).toHaveProperty(color);
    });
  });
});

describe('Tailwind Configuration - Gradient Presets', () => {
  const backgroundImage = tailwindConfig.theme?.extend?.backgroundImage;
  const gradients = (typeof backgroundImage === 'function' ? undefined : backgroundImage) as BackgroundImageObject | undefined;

  test('Gradient presets should be defined', () => {
    expect(gradients).toBeDefined();
  });

  test('Rank gradients should be defined', () => {
    expect(gradients?.['gradient-rank-first']).toBeDefined();
    expect(gradients?.['gradient-rank-second']).toBeDefined();
    expect(gradients?.['gradient-rank-third']).toBeDefined();
  });

  test('Rank gradients should use linear-gradient with CSS variables', () => {
    expect(gradients?.['gradient-rank-first']).toContain('linear-gradient');
    expect(gradients?.['gradient-rank-first']).toContain('var(--gradient-rank-first-from)');
    expect(gradients?.['gradient-rank-first']).toContain('var(--gradient-rank-first-via)');
    expect(gradients?.['gradient-rank-first']).toContain('var(--gradient-rank-first-to)');
  });

  test('Stat gradients should be defined', () => {
    expect(gradients?.['gradient-stat-positive']).toBeDefined();
    expect(gradients?.['gradient-stat-negative']).toBeDefined();
    expect(gradients?.['gradient-stat-neutral']).toBeDefined();
  });

  test('Background gradients should be defined', () => {
    expect(gradients?.['gradient-bg-navy']).toBeDefined();
    expect(gradients?.['gradient-bg-accent']).toBeDefined();
  });

  test('All 8 gradient presets should use CSS variables', () => {
    const gradientKeys = [
      'gradient-rank-first',
      'gradient-rank-second',
      'gradient-rank-third',
      'gradient-stat-positive',
      'gradient-stat-negative',
      'gradient-stat-neutral',
      'gradient-bg-navy',
      'gradient-bg-accent',
    ];

    gradientKeys.forEach(key => {
      expect(gradients?.[key]).toContain('var(--gradient-');
    });
  });
});

describe('Tailwind Configuration - Custom Plugin', () => {
  test('Custom plugin should be registered', () => {
    expect(tailwindConfig.plugins).toBeDefined();
    expect(Array.isArray(tailwindConfig.plugins)).toBe(true);
    // Plugin is a function, so we check it exists (length should be 2: tailwindcss-animate + custom)
    expect(tailwindConfig.plugins!.length).toBeGreaterThanOrEqual(2);
  });

  test('Custom plugin should be a function', () => {
    const customPlugin = tailwindConfig.plugins![1];
    expect(typeof customPlugin).toBe('function');
  });
});

describe('Tailwind Configuration - Backward Compatibility', () => {
  test('Neo-Brutalist color palette should still exist', () => {
    const colors = tailwindConfig.theme?.extend?.colors;
    const neoColors = (typeof colors === 'function' ? undefined : colors?.neo) as ColorObject | undefined;
    expect(neoColors).toBeDefined();
    expect(neoColors?.yellow).toBe('var(--neo-yellow)');
    expect(neoColors?.pink).toBe('var(--neo-pink)');
    expect(neoColors?.cyan).toBe('var(--neo-cyan)');
  });

  test('Avatar numeric colors should still exist', () => {
    const colors = tailwindConfig.theme?.extend?.colors;
    const avatarColors = (typeof colors === 'function' ? undefined : colors?.avatar) as ColorObject | undefined;
    expect(avatarColors).toBeDefined();
    expect(avatarColors?.['1']).toBeDefined();
    expect(avatarColors?.['10']).toBeDefined();
    expect(avatarColors?.['15']).toBeDefined();
  });

  test('Hard shadow utilities should still exist', () => {
    const boxShadow = tailwindConfig.theme?.extend?.boxShadow;
    const shadows = (typeof boxShadow === 'function' ? undefined : boxShadow) as BoxShadowObject | undefined;
    expect(shadows).toBeDefined();
    expect(shadows?.['hard']).toBeDefined();
    expect(shadows?.['hard-lg']).toBeDefined();
  });
});

describe('Tailwind Configuration - Completeness', () => {
  test('Configuration should have proper structure', () => {
    expect(tailwindConfig).toHaveProperty('darkMode');
    expect(tailwindConfig).toHaveProperty('content');
    expect(tailwindConfig).toHaveProperty('theme');
    expect(tailwindConfig).toHaveProperty('plugins');
  });

  test('Extended theme should include new design tokens', () => {
    const extended = tailwindConfig.theme?.extend;
    expect(extended).toHaveProperty('colors');
    expect(extended).toHaveProperty('backgroundImage');
  });
});
