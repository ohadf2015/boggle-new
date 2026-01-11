/**
 * CSS Variables Test
 *
 * Validates that all 74 design token CSS variables are defined in globals.css
 * Tests Phase 2 implementation of the color consolidation project.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Design System CSS Variables', () => {
  let cssContent: string;

  beforeAll(() => {
    const globalsPath = join(process.cwd(), 'app', 'globals.css');
    cssContent = readFileSync(globalsPath, 'utf-8');
  });

  describe('Brand Colors (21 variables)', () => {
    const brandColors = [
      '--brand-google',
      '--brand-google-hover',
      '--brand-google-dark',
      '--brand-discord',
      '--brand-discord-hover',
      '--brand-discord-dark',
      '--brand-apple',
      '--brand-apple-hover',
      '--brand-apple-light',
      '--brand-whatsapp',
      '--brand-whatsapp-hover',
      '--brand-whatsapp-dark',
      '--brand-facebook',
      '--brand-facebook-hover',
      '--brand-facebook-dark',
      '--brand-twitter',
      '--brand-twitter-hover',
      '--brand-twitter-dark',
      '--brand-linkedin',
      '--brand-linkedin-hover',
      '--brand-linkedin-dark',
    ];

    test.each(brandColors)('%s should be defined', (varName) => {
      expect(cssContent).toContain(`${varName}:`);
    });
  });

  describe('Avatar Character Mappings (15 variables)', () => {
    const avatarMappings = [
      '--avatar-broccoli-bob',
      '--avatar-drippy-drop',
      '--avatar-sunny-steve',
      '--avatar-pizza-pete',
      '--avatar-cloudy-carl',
      '--avatar-octo-otto',
      '--avatar-prickly-pat',
      '--avatar-melon-molly',
      '--avatar-avo-alex',
      '--avatar-frosty-frank',
      '--avatar-flaky-fred',
      '--avatar-eggy-ed',
      '--avatar-slimy-sam',
      '--avatar-starry-stella',
      '--avatar-shroom-shelly',
    ];

    test.each(avatarMappings)('%s should be defined', (varName) => {
      expect(cssContent).toContain(`${varName}:`);
    });

    test('Avatar mappings should reference numeric avatars', () => {
      expect(cssContent).toContain('--avatar-broccoli-bob: var(--avatar-10)');
      expect(cssContent).toContain('--avatar-drippy-drop: var(--avatar-2)');
      expect(cssContent).toContain('--avatar-sunny-steve: var(--avatar-9)');
    });
  });

  describe('Gradient Presets (18 variables)', () => {
    const gradientPresets = [
      '--gradient-rank-first-from',
      '--gradient-rank-first-via',
      '--gradient-rank-first-to',
      '--gradient-rank-second-from',
      '--gradient-rank-second-via',
      '--gradient-rank-second-to',
      '--gradient-rank-third-from',
      '--gradient-rank-third-via',
      '--gradient-rank-third-to',
      '--gradient-stat-positive-from',
      '--gradient-stat-positive-to',
      '--gradient-stat-negative-from',
      '--gradient-stat-negative-to',
      '--gradient-stat-neutral-from',
      '--gradient-stat-neutral-to',
      '--gradient-bg-navy-from',
      '--gradient-bg-navy-to',
      '--gradient-bg-accent-from',
    ];

    test.each(gradientPresets)('%s should be defined', (varName) => {
      expect(cssContent).toContain(`${varName}:`);
    });
  });

  describe('Semantic Component Tokens (20 variables)', () => {
    describe('Button Tokens', () => {
      const buttonTokens = [
        '--button-primary',
        '--button-primary-hover',
        '--button-primary-text',
        '--button-secondary',
        '--button-secondary-hover',
        '--button-secondary-text',
        '--button-destructive',
        '--button-destructive-hover',
        '--button-destructive-text',
        '--button-success',
        '--button-success-hover',
        '--button-success-text',
      ];

      test.each(buttonTokens)('%s should be defined', (varName) => {
        expect(cssContent).toContain(`${varName}:`);
      });
    });

    describe('Badge Tokens', () => {
      const badgeTokens = [
        '--badge-info',
        '--badge-info-text',
        '--badge-warning',
        '--badge-warning-text',
        '--badge-error',
        '--badge-error-text',
        '--badge-success',
        '--badge-success-text',
      ];

      test.each(badgeTokens)('%s should be defined', (varName) => {
        expect(cssContent).toContain(`${varName}:`);
      });
    });
  });

  describe('Total Variable Count', () => {
    test('Should have all 74 new CSS variables', () => {
      // Count brand colors (21)
      const brandMatches = cssContent.match(/--brand-\w+(-\w+)?:/g) || [];
      expect(brandMatches.length).toBeGreaterThanOrEqual(21);

      // Count avatar character mappings (15)
      const avatarCharacterMatches = cssContent.match(/--avatar-[a-z]+-[a-z]+:/g) || [];
      expect(avatarCharacterMatches.length).toBeGreaterThanOrEqual(15);

      // Count gradient presets (18)
      const gradientMatches = cssContent.match(/--gradient-\w+(-\w+)*:/g) || [];
      expect(gradientMatches.length).toBeGreaterThanOrEqual(18);

      // Count button tokens (12)
      const buttonMatches = cssContent.match(/--button-\w+(-\w+)?:/g) || [];
      expect(buttonMatches.length).toBeGreaterThanOrEqual(12);

      // Count badge tokens (8)
      const badgeMatches = cssContent.match(/--badge-\w+(-\w+)?:/g) || [];
      expect(badgeMatches.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Backward Compatibility', () => {
    test('Original neo-color palette should still exist', () => {
      expect(cssContent).toContain('--neo-yellow:');
      expect(cssContent).toContain('--neo-pink:');
      expect(cssContent).toContain('--neo-cyan:');
      expect(cssContent).toContain('--neo-red:');
      expect(cssContent).toContain('--neo-lime:');
    });

    test('Original numeric avatar colors should still exist', () => {
      expect(cssContent).toContain('--avatar-1:');
      expect(cssContent).toContain('--avatar-10:');
      expect(cssContent).toContain('--avatar-15:');
    });
  });
});
