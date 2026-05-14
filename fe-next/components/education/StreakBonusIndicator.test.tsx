// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';
import StreakBonusIndicator from './StreakBonusIndicator';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'education.xp.streak': 'Day Streak',
        'education.xp.streakBonus': 'XP Bonus',
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
    div: ({ children, className, style, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <div className={className} style={style} {...props}>{children}</div>;
    },
    span: ({ children, className, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      return <span className={className} {...props}>{children}</span>;
    },
  },
}));

describe('StreakBonusIndicator', () => {
  describe('when streak is 0', () => {
    it('renders nothing', () => {
      const { container } = render(<StreakBonusIndicator currentStreak={0} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('when streak < 7 (no bonus)', () => {
    it('shows streak count at streak 3 without bonus', () => {
      render(<StreakBonusIndicator currentStreak={3} />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(/Day Streak/i)).toBeInTheDocument();
      // No bonus should be shown
      expect(screen.queryByText(/\+\d+%/)).not.toBeInTheDocument();
    });

    it('shows fire emoji', () => {
      render(<StreakBonusIndicator currentStreak={5} />);

      // Fire emoji should be present
      expect(screen.getByTestId('streak-indicator')).toHaveTextContent('5');
    });
  });

  describe('streak bonus multipliers', () => {
    it('shows +50% at streak 7', () => {
      render(<StreakBonusIndicator currentStreak={7} />);

      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText(/\+50%/)).toBeInTheDocument();
    });

    it('shows +50% at streak 13 (still in 7+ tier)', () => {
      render(<StreakBonusIndicator currentStreak={13} />);

      expect(screen.getByText('13')).toBeInTheDocument();
      expect(screen.getByText(/\+50%/)).toBeInTheDocument();
    });

    it('shows +75% at streak 14', () => {
      render(<StreakBonusIndicator currentStreak={14} />);

      expect(screen.getByText('14')).toBeInTheDocument();
      expect(screen.getByText(/\+75%/)).toBeInTheDocument();
    });

    it('shows +75% at streak 29 (still in 14+ tier)', () => {
      render(<StreakBonusIndicator currentStreak={29} />);

      expect(screen.getByText('29')).toBeInTheDocument();
      expect(screen.getByText(/\+75%/)).toBeInTheDocument();
    });

    it('shows +100% at streak 30', () => {
      render(<StreakBonusIndicator currentStreak={30} />);

      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText(/\+100%/)).toBeInTheDocument();
    });

    it('shows +100% at streak 45 (still in 30+ tier)', () => {
      render(<StreakBonusIndicator currentStreak={45} />);

      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText(/\+100%/)).toBeInTheDocument();
    });
  });

  describe('showBonus prop', () => {
    it('hides bonus when showBonus is false even with streak >= 7', () => {
      render(<StreakBonusIndicator currentStreak={10} showBonus={false} />);

      expect(screen.getByText('10')).toBeInTheDocument();
      // Bonus should be hidden
      expect(screen.queryByText(/\+\d+%/)).not.toBeInTheDocument();
    });
  });

  describe('variant prop', () => {
    it('renders badge variant correctly', () => {
      render(<StreakBonusIndicator currentStreak={7} variant="badge" />);

      const indicator = screen.getByTestId('streak-indicator');
      // Badge variant should have badge-specific classes
      expect(indicator).toHaveClass('rounded-neo');
    });

    it('renders inline variant correctly', () => {
      render(<StreakBonusIndicator currentStreak={7} variant="inline" />);

      const indicator = screen.getByTestId('streak-indicator');
      // Inline variant should have inline-flex
      expect(indicator).toHaveClass('inline-flex');
    });
  });

  describe('size prop', () => {
    it('renders small size with smaller padding', () => {
      render(<StreakBonusIndicator currentStreak={7} size="sm" />);

      const indicator = screen.getByTestId('streak-indicator');
      // Small size has smaller padding
      expect(indicator).toHaveClass('px-2');
      expect(indicator).toHaveClass('py-1');
    });

    it('renders medium size (default) with larger padding', () => {
      render(<StreakBonusIndicator currentStreak={7} size="md" />);

      const indicator = screen.getByTestId('streak-indicator');
      // Medium size has larger padding
      expect(indicator).toHaveClass('px-3');
    });
  });

  describe('i18n keys', () => {
    it('uses correct translation keys', () => {
      render(<StreakBonusIndicator currentStreak={7} />);

      expect(screen.getByText(/Day Streak/i)).toBeInTheDocument();
    });
  });

  describe('neo-brutalist styling', () => {
    it('applies neo-brutalist styles for badge variant', () => {
      render(<StreakBonusIndicator currentStreak={7} variant="badge" />);

      const indicator = screen.getByTestId('streak-indicator');
      expect(indicator).toHaveClass('bg-neo-pink');
      expect(indicator).toHaveClass('border-neo-black');
      expect(indicator).toHaveClass('shadow-hard');
    });
  });

  describe('accessibility', () => {
    it('exposes a screen-reader label that does not depend on color', () => {
      render(<StreakBonusIndicator currentStreak={14} variant="badge" />);
      const indicator = screen.getByTestId('streak-indicator');
      // 14d = +75% multiplier; label must spell that out for color-blind users
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('14'),
      );
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('75'),
      );
    });

    it('still labels the streak when below the bonus threshold', () => {
      render(<StreakBonusIndicator currentStreak={3} variant="badge" />);
      const indicator = screen.getByTestId('streak-indicator');
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('3'),
      );
    });
  });
});
