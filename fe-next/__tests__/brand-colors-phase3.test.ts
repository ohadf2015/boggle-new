/**
 * Phase 3: Brand Color Migration Tests
 *
 * Verifies that all hardcoded brand colors (#25D366, #5865F2, etc.)
 * have been successfully migrated to design system tokens.
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

describe('Phase 3: Brand Color Migration', () => {
  // Files that were migrated in Phase 3
  const migratedFiles = [
    'components/ShareButton.tsx',
    'components/auth/shared/OAuthButtonGroup.tsx',
    'components/auth/DailyChallengeInlineSignup.tsx',
    'components/modals/UnifiedShareModal.tsx',
    'components/daily/results/SharePanel.tsx',
    'components/daily/DailyChallengeResults.tsx',
    'components/profile/ReferralCard.tsx',
    'components/daily/results/GuestBrainScorePreview.tsx',
    'components/daily/results/LeaderboardTeaser.tsx',
  ];

  // Hardcoded brand colors that should NOT appear in components (except tests)
  const hardcodedBrandColors = [
    '#25D366', // WhatsApp
    '#1ebe5d', // WhatsApp hover (old)
    '#20BA5A', // WhatsApp hover (old)
    '#5865F2', // Discord
    '#4752C4', // Discord hover
    '#1877F2', // Facebook
    '#0A66C2', // LinkedIn
  ];

  describe('migrated files use design tokens', () => {
    migratedFiles.forEach((filePath) => {
      it(`${filePath} should not contain hardcoded brand colors`, () => {
        const fullPath = path.join(process.cwd(), filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');

        hardcodedBrandColors.forEach((color) => {
          expect(content).not.toContain(color);
        });
      });

      it(`${filePath} should use brand color tokens`, () => {
        const fullPath = path.join(process.cwd(), filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Check if file uses at least one brand color token
        const hasBrandTokens =
          content.includes('bg-brand-whatsapp') ||
          content.includes('bg-brand-discord') ||
          content.includes('bg-brand-facebook') ||
          content.includes('bg-brand-linkedin') ||
          content.includes('bg-brand-whatsapp-hover') ||
          content.includes('bg-brand-discord-hover');

        expect(hasBrandTokens).toBe(true);
      });
    });
  });

  describe('no hardcoded brand colors in components', () => {
    it('should not find hardcoded brand colors in any component files (excluding tests)', async () => {
      const componentFiles = await glob('components/**/*.{ts,tsx}', {
        cwd: process.cwd(),
        ignore: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/__tests__/**'],
      });

      const filesWithHardcodedColors: string[] = [];

      componentFiles.forEach((filePath) => {
        const fullPath = path.join(process.cwd(), filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');

        hardcodedBrandColors.forEach((color) => {
          if (content.includes(color)) {
            filesWithHardcodedColors.push(`${filePath} contains ${color}`);
          }
        });
      });

      expect(filesWithHardcodedColors).toEqual([]);
    });
  });

  describe('brand color tokens exist in Tailwind config', () => {
    it('should have brand-whatsapp color defined', () => {
      const tailwindConfig = path.join(process.cwd(), 'tailwind.config.js');
      const content = fs.readFileSync(tailwindConfig, 'utf-8');

      expect(content).toContain('brand-whatsapp');
    });

    it('should have brand-discord color defined', () => {
      const tailwindConfig = path.join(process.cwd(), 'tailwind.config.js');
      const content = fs.readFileSync(tailwindConfig, 'utf-8');

      expect(content).toContain('brand-discord');
    });

    it('should have brand-facebook color defined', () => {
      const tailwindConfig = path.join(process.cwd(), 'tailwind.config.js');
      const content = fs.readFileSync(tailwindConfig, 'utf-8');

      expect(content).toContain('brand-facebook');
    });

    it('should have brand-linkedin color defined', () => {
      const tailwindConfig = path.join(process.cwd(), 'tailwind.config.js');
      const content = fs.readFileSync(tailwindConfig, 'utf-8');

      expect(content).toContain('brand-linkedin');
    });
  });

  describe('CSS variables exist in globals.css', () => {
    it('should have --brand-whatsapp CSS variable', () => {
      const globalsCSS = path.join(process.cwd(), 'app', 'globals.css');
      const content = fs.readFileSync(globalsCSS, 'utf-8');

      expect(content).toContain('--brand-whatsapp:');
    });

    it('should have --brand-discord CSS variable', () => {
      const globalsCSS = path.join(process.cwd(), 'app', 'globals.css');
      const content = fs.readFileSync(globalsCSS, 'utf-8');

      expect(content).toContain('--brand-discord:');
    });

    it('should have --brand-facebook CSS variable', () => {
      const globalsCSS = path.join(process.cwd(), 'app', 'globals.css');
      const content = fs.readFileSync(globalsCSS, 'utf-8');

      expect(content).toContain('--brand-facebook:');
    });

    it('should have --brand-linkedin CSS variable', () => {
      const globalsCSS = path.join(process.cwd(), 'app', 'globals.css');
      const content = fs.readFileSync(globalsCSS, 'utf-8');

      expect(content).toContain('--brand-linkedin:');
    });

    it('should have hover variants for brand colors', () => {
      const globalsCSS = path.join(process.cwd(), 'app', 'globals.css');
      const content = fs.readFileSync(globalsCSS, 'utf-8');

      expect(content).toContain('--brand-whatsapp-hover:');
      expect(content).toContain('--brand-discord-hover:');
    });
  });

  describe('specific component implementations', () => {
    it('ShareButton.tsx should use bg-brand-whatsapp for whatsapp variant', () => {
      const filePath = path.join(process.cwd(), 'components', 'ShareButton.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('bg-brand-whatsapp');
    });

    it('OAuthButtonGroup.tsx should use bg-brand-discord for Discord button', () => {
      const filePath = path.join(process.cwd(), 'components', 'auth', 'shared', 'OAuthButtonGroup.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('bg-brand-discord');
    });

    it('SharePanel.tsx should use brand colors for social buttons', () => {
      const filePath = path.join(process.cwd(), 'components', 'daily', 'results', 'SharePanel.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('bg-brand-whatsapp');
      expect(content).toContain('bg-brand-facebook');
      expect(content).toContain('bg-brand-linkedin');
    });

    it('DailyChallengeResults.tsx should use bg-brand-whatsapp', () => {
      const filePath = path.join(process.cwd(), 'components', 'daily', 'DailyChallengeResults.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('bg-brand-whatsapp');
    });

    it('ReferralCard.tsx should use brand-whatsapp with hover state', () => {
      const filePath = path.join(process.cwd(), 'components', 'profile', 'ReferralCard.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('bg-brand-whatsapp');
      expect(content).toContain('hover:bg-brand-whatsapp-hover');
    });

    it('GuestBrainScorePreview.tsx should use brand-discord with hover state', () => {
      const filePath = path.join(process.cwd(), 'components', 'daily', 'results', 'GuestBrainScorePreview.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('bg-brand-discord');
      expect(content).toContain('hover:bg-brand-discord-hover');
    });

    it('LeaderboardTeaser.tsx should use brand-discord with hover state', () => {
      const filePath = path.join(process.cwd(), 'components', 'daily', 'results', 'LeaderboardTeaser.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('bg-brand-discord');
      expect(content).toContain('hover:bg-brand-discord-hover');
    });
  });
});
