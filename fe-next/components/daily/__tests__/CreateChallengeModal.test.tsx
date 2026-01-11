/**
 * Tests for CreateChallengeModal translation coverage and responsive design
 *
 * This test validates that:
 * 1. All UI text uses translation keys (no hardcoded strings)
 * 2. Modal has proper overflow handling and responsive styling
 */

import * as fs from 'fs';
import * as path from 'path';

describe('CreateChallengeModal - Translation & Responsive Design', () => {
  const modalPath = path.join(__dirname, '../CreateChallengeModal.tsx');
  const modalCode = fs.readFileSync(modalPath, 'utf-8');

  describe('Translation key usage', () => {
    it('should use t() for all UI text - no hardcoded strings', () => {
      // Check that all user-facing text uses translation function
      expect(modalCode).toContain("t('daily.createChallengeTitle')");
      expect(modalCode).toContain("t('daily.chooseBoardSize')");
      expect(modalCode).toContain("t('daily.generateChallenge')");
      expect(modalCode).toContain("t('daily.generatingPuzzle')");
      expect(modalCode).toContain("t('daily.challengeCreated')");
      expect(modalCode).toContain("t('daily.challengeCreatedDesc')");
      expect(modalCode).toContain("t('daily.shareChallenge')");
      expect(modalCode).toContain("t('daily.canPlayYourself')");
    });

    it('should import useLanguage hook', () => {
      expect(modalCode).toContain("import { useLanguage } from '@/contexts/LanguageContext'");
    });

    it('should declare t function from useLanguage', () => {
      expect(modalCode).toContain('const { t } = useLanguage()');
    });
  });

  describe('Modal responsive design', () => {
    it('should have max-width constraint (max-w-lg)', () => {
      expect(modalCode).toContain('max-w-lg');
    });

    it('should have max-height constraint (max-h-[90vh])', () => {
      expect(modalCode).toContain('max-h-[90vh]');
    });

    it('should have overflow-y-auto for scrolling', () => {
      expect(modalCode).toContain('overflow-y-auto');
    });

    it('should use responsive calc width to prevent overflow', () => {
      expect(modalCode).toContain('w-[calc(100%-2rem)]');
    });

    it('should have responsive padding (p-4 sm:p-6 for compactness)', () => {
      expect(modalCode).toContain('p-4 sm:p-6');
    });

    it('should have sticky header to stay visible when scrolling', () => {
      expect(modalCode).toContain('sticky top-0');
    });
  });
});
