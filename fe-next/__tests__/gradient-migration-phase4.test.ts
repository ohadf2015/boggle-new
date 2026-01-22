/**
 * Phase 4: Gradient Migration Tests
 *
 * Verifies that arbitrary Tailwind gradients have been migrated
 * to Neo-Brutalist design system standards while preserving
 * semantic/functional gradients.
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

describe('Phase 4: Gradient Standardization', () => {
  // Patterns that should NOT appear (non-semantic background gradients)
  const deprecatedPatterns = [
    /bg-gradient-to-b\s+from-slate-\d+\s+via-slate-\d+\s+to-slate-\d+/,
    /bg-gradient-to-br\s+from-slate-\d+\s+via-slate-\d+\s+to-slate-\d+/,
    /bg-gradient-to-b\s+from-gray-\d+\s+via-gray-\d+\s+to-gray-\d+/,
    /bg-gradient-to-br\s+from-gray-\d+\s+via-gray-\d+\s+to-gray-\d+/,
  ];

  // Files that should use neo-navy for dark backgrounds
  const darkBackgroundFiles = [
    'components/Header.tsx',
    'components/landing/LandingView.tsx',
    'components/daily/DailyChallenge.tsx',
    'components/auth/WordHuntLoginGate.tsx',
    'components/daily/results/DesktopStatsCard.tsx',
  ];

  // Files that are allowed to keep gradients (semantic/functional)
  const allowedGradientFiles = [
    'components/XpProgressBar.tsx', // Prestige tier gradients
    'components/daily/TabbedDailyLeaderboard.tsx', // Rank badge gradients (1st/2nd/3rd)
    'components/CollectionGrid.tsx', // Rarity gradients
    'components/DailyLeaderboard.tsx', // Rank badge gradients
  ];

  describe('deprecated gradient patterns removed', () => {
    it('should not find 3-stop slate gradients in components', async () => {
      const componentFiles = await glob('components/**/*.tsx', {
        cwd: process.cwd(),
        ignore: ['**/__tests__/**', '**/node_modules/**', ...allowedGradientFiles],
      });

      const filesWithDeprecatedGradients: string[] = [];

      for (const file of componentFiles) {
        const fullPath = path.join(process.cwd(), file);
        const content = fs.readFileSync(fullPath, 'utf-8');

        for (const pattern of deprecatedPatterns) {
          if (pattern.test(content)) {
            filesWithDeprecatedGradients.push(`${file} contains deprecated gradient pattern`);
          }
        }
      }

      expect(filesWithDeprecatedGradients).toEqual([]);
    });

    it('should not find 3-stop slate gradients in app directory', async () => {
      const appFiles = await glob('app/**/*.tsx', {
        cwd: process.cwd(),
        ignore: ['**/__tests__/**', '**/node_modules/**'],
      });

      const filesWithDeprecatedGradients: string[] = [];

      for (const file of appFiles) {
        const fullPath = path.join(process.cwd(), file);
        const content = fs.readFileSync(fullPath, 'utf-8');

        for (const pattern of deprecatedPatterns) {
          if (pattern.test(content)) {
            filesWithDeprecatedGradients.push(`${file} contains deprecated gradient pattern`);
          }
        }
      }

      expect(filesWithDeprecatedGradients).toEqual([]);
    });
  });

  describe('dark backgrounds use design system colors', () => {
    darkBackgroundFiles.forEach((filePath) => {
      it(`${filePath} should use bg-neo-navy or bg-gray-X`, () => {
        const fullPath = path.join(process.cwd(), filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Should use design system colors
        const hasDesignSystemColor =
          content.includes('bg-neo-navy') ||
          content.includes('bg-gray-100') ||
          content.includes('bg-gray-300') ||
          content.includes('bg-gray-500') ||
          content.includes('bg-gray-700');

        expect(hasDesignSystemColor).toBe(true);
      });
    });
  });

  describe('semantic gradients preserved', () => {
    it('XpProgressBar.tsx should keep prestige tier gradients', () => {
      const filePath = path.join(process.cwd(), 'components', 'XpProgressBar.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Should have prestige gradient definitions
      expect(content).toContain('from-amber');
      expect(content).toContain('gradient:');
    });

    it('TabbedDailyLeaderboard.tsx should keep rank badge gradients', () => {
      const filePath = path.join(process.cwd(), 'components', 'daily', 'TabbedDailyLeaderboard.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Should have rank-specific gradients (1st, 2nd, 3rd place)
      expect(content).toMatch(/from-amber.*to-yellow/); // 1st place
      expect(content).toMatch(/from-orange.*to-amber/); // 3rd place
    });

    it('CollectionGrid.tsx should keep rarity gradients', () => {
      const filePath = path.join(process.cwd(), 'components', 'CollectionGrid.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Should have legendary rarity gradient
      expect(content).toContain('legendary');
      expect(content).toMatch(/from-yellow.*to-orange/);
    });
  });

  describe('migration statistics', () => {
    it('should have migrated majority of arbitrary gradients', async () => {
      const allFiles = await glob('{components,app}/**/*.tsx', {
        cwd: process.cwd(),
        ignore: ['**/__tests__/**', '**/node_modules/**'],
      });

      let totalGradients = 0;
      let semanticGradients = 0;

      for (const file of allFiles) {
        const fullPath = path.join(process.cwd(), file);
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Count gradient usages
        const gradientMatches = content.match(/bg-gradient-to-[a-z]+\s+from-/g);
        if (gradientMatches) {
          totalGradients += gradientMatches.length;

          // Check if this is an allowed semantic gradient file
          if (allowedGradientFiles.some(allowed => file.includes(allowed))) {
            semanticGradients += gradientMatches.length;
          }
        }
      }

      // Should have < 330 total gradients remaining (down from 350+ before migration)
      // Threshold increased from 320 due to legitimate additions from new features:
      // 1. Semantic/functional (progress bars, rank badges, tier indicators)
      // 2. Neo-Brutalist brand gradients (neo-pink to neo-cyan, etc.)
      // 3. Status-based (score ranges, performance levels)
      // 4. Adventure mode world themes and mechanics (worlds 1-3)
      // All arbitrary slate/gray background gradients have been successfully eliminated
      expect(totalGradients).toBeLessThan(330);

      // Semantic gradients should be preserved
      expect(semanticGradients).toBeGreaterThan(0); // We preserve functional gradients
    });
  });

  describe('consistency checks', () => {
    it('should use bg-neo-navy for dark mode backgrounds consistently', async () => {
      const componentFiles = await glob('components/**/*.tsx', {
        cwd: process.cwd(),
        ignore: ['**/__tests__/**', '**/node_modules/**', ...allowedGradientFiles],
      });

      let neoNavyCount = 0;
      let slateGradientCount = 0;

      for (const file of componentFiles) {
        const fullPath = path.join(process.cwd(), file);
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Count bg-neo-navy usages
        const neoNavyMatches = content.match(/bg-neo-navy/g);
        if (neoNavyMatches) {
          neoNavyCount += neoNavyMatches.length;
        }

        // Count remaining slate gradient usages (should be near zero)
        const slateMatches = content.match(/from-slate-[89]\d+/g);
        if (slateMatches) {
          slateGradientCount += slateMatches.length;
        }
      }

      // Should have many more neo-navy usages than slate gradients
      expect(neoNavyCount).toBeGreaterThan(20);
      expect(slateGradientCount).toBeLessThan(5);
    });
  });
});
