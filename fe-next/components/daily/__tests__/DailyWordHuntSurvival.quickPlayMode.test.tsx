'use client';

/**
 * Tests for Bug 1 and Bug 3 fixes:
 * - Bug 1: Quit dialog shows Word Hunt copy in Quick Play (practice=true)
 * - Bug 3: Daily-only HUD (tier badge) is hidden in Quick Play (practice=true)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildQuitDialogConfig } from '../survival/quitDialogConfig';
import { SurvivalHeader } from '../survival/SurvivalHeader';

describe('DailyWordHuntSurvival - Quick Play mode (Bugs 1 & 3)', () => {
  const mockT = vi.fn((key: string) => {
    const translations: Record<string, string> = {
      'common.cancel': 'Cancel',
      'common.quit': 'Quit',
      'wordHunt.quitConfirmTitle': 'Leave the Hunt?',
      'wordHunt.quitConfirmMessage': 'Your progress will be lost!',
      'daily.imSure': 'Leave anyway',
      'daily.quitConfirmTitle': 'Leave mid-game?',
      'daily.quitConfirm': "Your progress won't be saved. You'll need to watch an ad to play again today.",
    };
    return translations[key] || key;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Bug 1 - Quit dialog copy', () => {
    it('should use Word Hunt copy when practice=true', () => {
      const config = buildQuitDialogConfig(mockT, {
        titleKey: 'wordHunt.quitConfirmTitle',
        descriptionKey: 'wordHunt.quitConfirmMessage',
        confirmKey: 'daily.imSure',
        cancelKey: 'common.cancel',
      });

      expect(config.title).toBe('Leave the Hunt?');
      expect(config.description).toBe('Your progress will be lost!');
      expect(config.confirmText).toBe('Leave anyway');
      expect(config.cancelText).toBe('Cancel');
    });

    it('should use daily copy when practice=false (default)', () => {
      const config = buildQuitDialogConfig(mockT);

      expect(config.title).toBe('Leave mid-game?');
      expect(config.description).toBe("Your progress won't be saved. You'll need to watch an ad to play again today.");
      expect(config.confirmText).toBe('Leave anyway');
      expect(config.cancelText).toBe('Cancel');
    });
  });

  describe('Bug 3 - Daily-only HUD gating', () => {
    it('should NOT render AccumulatedScoreDisplay when practice=true', () => {
      const { container } = render(
        <SurvivalHeader
          liveScore={150}
          lastScoreIncrement={null}
          isScoreAnimating={false}
          onQuitClick={vi.fn()}
          practice={true}
          t={mockT}
        />
      );

      expect(container.querySelector('[data-testid="score-display"]')).not.toBeInTheDocument();
    });

    it('should render AccumulatedScoreDisplay when practice=false (daily mode)', () => {
      const { container } = render(
        <SurvivalHeader
          liveScore={150}
          lastScoreIncrement={null}
          isScoreAnimating={false}
          onQuitClick={vi.fn()}
          practice={false}
          t={mockT}
        />
      );

      expect(container.querySelector('[data-testid="score-display"]')).toBeInTheDocument();
    });

    it('should render AccumulatedScoreDisplay by default (backward compatibility)', () => {
      const { container } = render(
        <SurvivalHeader
          liveScore={150}
          lastScoreIncrement={null}
          isScoreAnimating={false}
          onQuitClick={vi.fn()}
          t={mockT}
        />
      );

      expect(container.querySelector('[data-testid="score-display"]')).toBeInTheDocument();
    });
  });
});
