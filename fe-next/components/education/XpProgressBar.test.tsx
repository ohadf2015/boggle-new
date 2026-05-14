// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';
import XpProgressBar from './XpProgressBar';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'education.xp.level': 'Level',
        'education.xp.nextLevel': 'Next Level',
        'education.xp.progress': 'Progress',
        'education.xp.keepGoing': 'Keep practicing to level up!',
        'education.xp.totalXp': 'Total XP',
        'education.xp.xpLabel': 'XP',
      };
      let result = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
      }
      return result;
    },
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, initial, animate, transition, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // For the progress bar fill, compute transform from animate prop (uses scaleX)
      const computedStyle = { ...style } as React.CSSProperties;
      if (animate && typeof animate === 'object' && 'scaleX' in animate) {
        computedStyle.transform = `scaleX(${(animate as { scaleX: number }).scaleX})`;
      }
      return <div className={className} style={computedStyle} data-testid="motion-div" {...props}>{children}</div>;
    },
    span: ({ children, className, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <span className={className} {...props}>{children}</span>;
    },
  },
}));

// Mock xpManager
vi.mock('@/backend/modules/xpManager', () => ({
  getXpProgress: vi.fn((totalXp: number) => {
    // Simple level calculation for tests
    const level = Math.floor(totalXp / 100) + 1;
    const xpInCurrentLevel = totalXp % 100;
    const xpNeededForNextLevel = 100;
    const progressPercent = Math.min(100, xpInCurrentLevel);
    const isMaxLevel = level >= 100;

    return {
      currentLevel: Math.min(level, 100),
      totalXp,
      currentLevelXp: (level - 1) * 100,
      nextLevelXp: level * 100,
      xpInCurrentLevel,
      xpNeededForNextLevel,
      progressPercent: isMaxLevel ? 100 : progressPercent,
      isMaxLevel,
    };
  }),
}));

describe('XpProgressBar', () => {
  describe('rendering', () => {
    it('renders with correct level', () => {
      render(<XpProgressBar totalXp={250} />);

      // Level 3 (250 XP / 100 = 2.5, so level 3)
      // Check wrapper contains both Level text and the number 3
      const wrapper = screen.getByTestId('xp-progress-wrapper');
      expect(wrapper).toHaveTextContent('Level');
      expect(wrapper).toHaveTextContent('3');
    });

    it('renders progress percentage correctly', () => {
      render(<XpProgressBar totalXp={150} />);

      // 150 XP: Level 2, 50 XP into level = 50%
      const progressBar = screen.getByTestId('xp-progress-fill');
      // Uses scaleX for compositor-only animation
      expect(progressBar).toHaveStyle({ transform: 'scaleX(0.5)' });
    });

    it('shows XP values when showLevel is true (default)', () => {
      render(<XpProgressBar totalXp={150} />);

      // Should show XP progress info - look for the XP text in the progress bar area
      // 50/100 XP format
      const xpContainer = screen.getByTestId('xp-progress-wrapper');
      expect(xpContainer).toHaveTextContent('50');
      expect(xpContainer).toHaveTextContent('100');
      expect(xpContainer).toHaveTextContent('XP');
    });

    it('shows next level preview when showNextLevel is true (default)', () => {
      render(<XpProgressBar totalXp={150} showNextLevel={true} />);

      expect(screen.getByText(/Next Level/i)).toBeInTheDocument();
    });

    it('hides next level preview when showNextLevel is false', () => {
      render(<XpProgressBar totalXp={150} showNextLevel={false} />);

      expect(screen.queryByText(/Next Level/i)).not.toBeInTheDocument();
    });
  });

  describe('max level state', () => {
    it('shows max level state when at level 100', () => {
      // 10000 XP = level 100+
      render(<XpProgressBar totalXp={10000} />);

      expect(screen.getByText('100')).toBeInTheDocument();
      // Progress should be 100% (scaleX(1))
      const progressBar = screen.getByTestId('xp-progress-fill');
      expect(progressBar).toHaveStyle({ transform: 'scaleX(1)' });
    });
  });

  describe('size variants', () => {
    it('renders small size correctly', () => {
      render(<XpProgressBar totalXp={100} size="sm" />);

      const container = screen.getByTestId('xp-progress-container');
      expect(container).toHaveClass('h-6');
    });

    it('renders medium size correctly (default)', () => {
      render(<XpProgressBar totalXp={100} size="md" />);

      const container = screen.getByTestId('xp-progress-container');
      expect(container).toHaveClass('h-8');
    });

    it('renders large size correctly', () => {
      render(<XpProgressBar totalXp={100} size="lg" />);

      const container = screen.getByTestId('xp-progress-container');
      expect(container).toHaveClass('h-10');
    });
  });

  describe('recent XP gain highlight', () => {
    it('shows recent XP gain indicator when provided', () => {
      render(<XpProgressBar totalXp={150} recentXpGain={50} />);

      expect(screen.getByText(/\+50/)).toBeInTheDocument();
    });

    it('does not show indicator when recentXpGain is not provided', () => {
      render(<XpProgressBar totalXp={150} />);

      expect(screen.queryByText(/\+\d+/)).not.toBeInTheDocument();
    });
  });

  describe('RTL support', () => {
    it('wrapper includes dir attribute for RTL handling', () => {
      render(<XpProgressBar totalXp={150} />);

      // Component should have dir attribute (ltr by default from mock)
      const wrapper = screen.getByTestId('xp-progress-wrapper');
      expect(wrapper).toHaveAttribute('dir', 'ltr');
    });
  });

  describe('reduced motion preference', () => {
    beforeEach(() => {
      // Mock matchMedia for reduced motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-m: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    });

    it('respects reduced motion preference', () => {
      render(<XpProgressBar totalXp={150} />);

      // When reduced motion is preferred, component should still render
      expect(screen.getByTestId('xp-progress-wrapper')).toBeInTheDocument();
    });
  });

  describe('neo-brutalist styling', () => {
    it('applies neo-brutalist border styles', () => {
      render(<XpProgressBar totalXp={150} />);

      const container = screen.getByTestId('xp-progress-container');
      // Uses border-neo-black for the chunky border and shadow-hard for hard shadows
      expect(container).toHaveClass('border-neo-black');
      expect(container).toHaveClass('shadow-hard');
    });

    it('uses neo-lime for progress fill', () => {
      render(<XpProgressBar totalXp={150} />);

      const progressFill = screen.getByTestId('xp-progress-fill');
      expect(progressFill).toHaveClass('bg-neo-lime');
    });
  });

  describe('accessibility', () => {
    it('announces recent XP gain via a polite live region', () => {
      render(<XpProgressBar totalXp={150} recentXpGain={25} />);
      const announcer = screen.getByTestId('xp-recent-gain');
      expect(announcer).toHaveAttribute('role', 'status');
      expect(announcer).toHaveAttribute('aria-live', 'polite');
      expect(announcer).toHaveTextContent('+25');
    });

    it('does not render the live region when no XP was gained', () => {
      render(<XpProgressBar totalXp={150} />);
      expect(screen.queryByTestId('xp-recent-gain')).not.toBeInTheDocument();
    });
  });
});
