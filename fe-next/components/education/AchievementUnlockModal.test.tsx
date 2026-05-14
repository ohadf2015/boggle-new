/**
 * AchievementUnlockModal Component Tests
 * Tests achievement celebration modal UI with tier-appropriate prominence
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AchievementUnlockModal } from './AchievementUnlockModal';
import type { UnlockPayload } from '@/hooks/useAchievementUnlock';
import * as confettiUtils from '@/utils/confettiUtils';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'education.achievements.unlocked': 'Achievement Unlocked!',
        'education.achievements.upgraded': 'Upgraded to {tier}!',
        'education.achievements.continue': 'Continue',
        'education.achievements.tiers.bronze': 'Bronze',
        'education.achievements.tiers.silver': 'Silver',
        'education.achievements.tiers.gold': 'Gold',
        'education.achievements.tiers.platinum': 'Platinum',
        'education.achievements.newBadge': 'New Badge!',
        'education.achievements.tierUpgrade': 'Tier Upgrade!',
      };
      if (vars) {
        let result = translations[key] || key;
        Object.entries(vars).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
        return result;
      }
      return translations[key] || key;
    },
    currentLang: 'en',
  }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireLevelUpConfetti: vi.fn(),
}));

const mockTrackUnlock = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackEduAchievementUnlock: (...args: unknown[]) => mockTrackUnlock(...args),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, onClick, ...props }: any) => (
      <div onClick={onClick} {...props}>
        {children}
      </div>
    ),
    button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('AchievementUnlockModal', () => {
  const mockOnClose = vi.fn();
  const mockFireConfetti = confettiUtils.fireLevelUpConfetti as jest.MockedFunction<
    typeof confettiUtils.fireLevelUpConfetti
  >;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when unlock is null', () => {
      render(<AchievementUnlockModal unlock={null} onClose={mockOnClose} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render toast for bronze tier', () => {
      const bronzeUnlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'bronze',
        icon: '📚',
        isNew: true,
        isUpgrade: false,
      };

      render(<AchievementUnlockModal unlock={bronzeUnlock} onClose={mockOnClose} />);

      // Should render toast (not full modal)
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveClass('fixed'); // Toast positioning
    });

    it('should render full modal for gold tier', () => {
      const goldUnlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'gold',
        icon: '📚',
        isNew: false,
        isUpgrade: true,
      };

      render(<AchievementUnlockModal unlock={goldUnlock} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should render full modal for platinum tier', () => {
      const platinumUnlock: UnlockPayload = {
        achievementKey: 'word_master',
        tier: 'platinum',
        icon: '🎓',
        isNew: false,
        isUpgrade: true,
      };

      render(<AchievementUnlockModal unlock={platinumUnlock} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('Upgraded to Platinum!')).toBeInTheDocument();
    });

    it('should show "Achievement Unlocked!" for new achievements', () => {
      const newUnlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'bronze',
        icon: '📚',
        isNew: true,
        isUpgrade: false,
      };

      render(<AchievementUnlockModal unlock={newUnlock} onClose={mockOnClose} />);

      expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
    });

    it('should show "Upgraded to {tier}!" for upgrades', () => {
      const upgradeUnlock: UnlockPayload = {
        achievementKey: 'word_master',
        tier: 'gold',
        icon: '🎓',
        isNew: false,
        isUpgrade: true,
      };

      render(<AchievementUnlockModal unlock={upgradeUnlock} onClose={mockOnClose} />);

      expect(screen.getByText('Upgraded to Gold!')).toBeInTheDocument();
    });
  });

  describe('Confetti', () => {
    it('should fire confetti for gold tier', () => {
      const goldUnlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'gold',
        icon: '📚',
        isNew: false,
        isUpgrade: true,
      };

      render(<AchievementUnlockModal unlock={goldUnlock} onClose={mockOnClose} />);

      expect(mockFireConfetti).toHaveBeenCalledTimes(1);
    });

    it('should fire confetti for platinum tier', () => {
      const platinumUnlock: UnlockPayload = {
        achievementKey: 'word_master',
        tier: 'platinum',
        icon: '🎓',
        isNew: false,
        isUpgrade: true,
      };

      render(<AchievementUnlockModal unlock={platinumUnlock} onClose={mockOnClose} />);

      expect(mockFireConfetti).toHaveBeenCalledTimes(1);
    });

    it('should NOT fire confetti for bronze tier', () => {
      const bronzeUnlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'bronze',
        icon: '📚',
        isNew: true,
        isUpgrade: false,
      };

      render(<AchievementUnlockModal unlock={bronzeUnlock} onClose={mockOnClose} />);

      expect(mockFireConfetti).not.toHaveBeenCalled();
    });

    it('should NOT fire confetti for silver tier', () => {
      const silverUnlock: UnlockPayload = {
        achievementKey: 'streak_starter',
        tier: 'silver',
        icon: '🔥',
        isNew: false,
        isUpgrade: true,
      };

      render(<AchievementUnlockModal unlock={silverUnlock} onClose={mockOnClose} />);

      expect(mockFireConfetti).not.toHaveBeenCalled();
    });
  });

  describe('Interaction', () => {
    it('should call onClose when escape key pressed', () => {
      const unlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'gold',
        icon: '📚',
        isNew: true,
        isUpgrade: false,
      };

      render(<AchievementUnlockModal unlock={unlock} onClose={mockOnClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking backdrop (gold tier)', () => {
      const unlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'gold',
        icon: '📚',
        isNew: true,
        isUpgrade: false,
      };

      render(<AchievementUnlockModal unlock={unlock} onClose={mockOnClose} />);

      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking Continue button', () => {
      const unlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'gold',
        icon: '📚',
        isNew: true,
        isUpgrade: false,
      };

      render(<AchievementUnlockModal unlock={unlock} onClose={mockOnClose} />);

      const continueBtn = screen.getByText('Continue');
      fireEvent.click(continueBtn);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should auto-dismiss toast after 3 seconds (bronze tier)', async () => {
      vi.useFakeTimers();

      const bronzeUnlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'bronze',
        icon: '📚',
        isNew: true,
        isUpgrade: false,
      };

      render(<AchievementUnlockModal unlock={bronzeUnlock} onClose={mockOnClose} />);

      // Fast-forward 3 seconds
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });

      vi.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      const unlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'gold',
        icon: '📚',
        isNew: true,
        isUpgrade: false,
      };

      render(<AchievementUnlockModal unlock={unlock} onClose={mockOnClose} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true" for full modal', () => {
      const unlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'gold',
        icon: '📚',
        isNew: true,
        isUpgrade: false,
      };

      render(<AchievementUnlockModal unlock={unlock} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', () => {
      const unlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'gold',
        icon: '📚',
        isNew: true,
        isUpgrade: false,
      };

      render(<AchievementUnlockModal unlock={unlock} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      const labelId = dialog.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();

      const title = document.getElementById(labelId!);
      expect(title).toBeInTheDocument();
    });
  });

  describe('Translation Keys', () => {
    it('should use correct translations for all tiers', () => {
      const tiers: Array<'bronze' | 'silver' | 'gold' | 'platinum'> = [
        'bronze',
        'silver',
        'gold',
        'platinum',
      ];

      tiers.forEach((tier) => {
        const unlock: UnlockPayload = {
          achievementKey: 'test',
          tier,
          icon: '🎯',
          isNew: false,
          isUpgrade: true,
        };

        const { unmount } = render(
          <AchievementUnlockModal unlock={unlock} onClose={mockOnClose} />
        );

        const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
        expect(screen.getByText(`Upgraded to ${tierName}!`)).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('telemetry (F1 wiring)', () => {
    beforeEach(() => mockTrackUnlock.mockClear());

    it('emits edu_achievement_unlock when an unlock appears', () => {
      const unlock: UnlockPayload = {
        achievementKey: 'first_lesson',
        tier: 'bronze',
        isUpgrade: false,
      };
      render(<AchievementUnlockModal unlock={unlock} onClose={vi.fn()} />);
      expect(mockTrackUnlock).toHaveBeenCalledWith({
        achievementId: 'first_lesson',
        tier: 'bronze',
      });
    });

    it('does not emit when unlock is null', () => {
      render(<AchievementUnlockModal unlock={null} onClose={vi.fn()} />);
      expect(mockTrackUnlock).not.toHaveBeenCalled();
    });
  });
});
