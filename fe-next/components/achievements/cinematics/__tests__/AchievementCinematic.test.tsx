import React from 'react';
import { render, screen } from '@testing-library/react';

import * as remotion from 'remotion';

// Mock @remotion/transitions (transitive dep via WordHuntPromoVideo)
vi.mock('@remotion/transitions', () => ({
  TransitionSeries: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  linearTiming: () => ({}),
}));

vi.mock('../../../../lib/remotion/fonts', () => ({
  fredokaFamily: 'Fredoka, sans-serif',
  rubikFamily: 'Rubik, sans-serif',
}));

import { AchievementCinematic, ACHIEVEMENT_DURATION_FRAMES } from '../AchievementCinematic';

beforeEach(() => {
  remotion.useCurrentFrame.mockReturnValue(120);
  remotion.useVideoConfig.mockReturnValue({ fps: 30, width: 1280, height: 720, durationInFrames: 210 });
  remotion.interpolate.mockImplementation((frame: number, inputRange: number[], outputRange: number[]) => {
    const [inMin, inMax] = inputRange;
    const [outMin, outMax] = outputRange;
    const t = Math.max(0, Math.min(1, (frame - inMin) / (inMax - inMin)));
    return outMin + t * (outMax - outMin);
  });
  remotion.spring.mockReturnValue(1);
});

describe('AchievementCinematic', () => {
  const goldProps = {
    achievementName: 'Word Master',
    description: 'Find 500 words total',
    icon: '📚',
    tier: 'GOLD' as const,
    tierColor: '#FFD700',
    tierGlow: 'rgba(255, 215, 0, 0.5)',
  };

  const platinumProps = {
    ...goldProps,
    tier: 'PLATINUM' as const,
    tierColor: '#E5E4E2',
    tierGlow: 'rgba(147, 112, 219, 0.6)',
  };

  describe('rendering', () => {
    it('should render the composition', () => {
      render(<AchievementCinematic {...goldProps} />);
      expect(screen.getAllByTestId('absolute-fill').length).toBeGreaterThan(0);
    });

    it('should display achievement name', () => {
      render(<AchievementCinematic {...goldProps} />);
      expect(screen.getByText('Word Master')).toBeInTheDocument();
    });

    it('should display description', () => {
      render(<AchievementCinematic {...goldProps} />);
      expect(screen.getByText('Find 500 words total')).toBeInTheDocument();
    });

    it('should display icon emoji', () => {
      render(<AchievementCinematic {...goldProps} />);
      // Icon appears in both silhouette and color reveal phases
      const icons = screen.getAllByText('📚');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should display tier label', () => {
      render(<AchievementCinematic {...goldProps} tierLabel="GOLD" />);
      expect(screen.getByText('GOLD')).toBeInTheDocument();
    });

    it('should use custom unlocked text', () => {
      render(<AchievementCinematic {...goldProps} unlockedText="LOGRO!" />);
      expect(screen.getByText('LOGRO!')).toBeInTheDocument();
    });
  });

  describe('stats', () => {
    it('should display stat when provided', () => {
      render(
        <AchievementCinematic
          {...goldProps}
          stat={{ label: 'Words Found', value: 500 }}
        />
      );
      expect(screen.getByText('Words Found')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });
  });

  describe('tier effects', () => {
    it('should render confetti for Gold tier', () => {
      render(<AchievementCinematic {...goldProps} />);
      const confetti = screen.queryAllByTestId('confetti-piece');
      expect(confetti.length).toBeGreaterThan(0);
    });

    it('should render more confetti for Platinum tier', () => {
      const { container: goldContainer } = render(<AchievementCinematic {...goldProps} />);
      const goldConfetti = goldContainer.querySelectorAll('[data-testid="confetti-piece"]').length;

      const { container: platContainer } = render(<AchievementCinematic {...platinumProps} />);
      const platConfetti = platContainer.querySelectorAll('[data-testid="confetti-piece"]').length;

      expect(platConfetti).toBeGreaterThan(goldConfetti);
    });

    it('should render shatter fragments for Platinum only', () => {
      const { container: goldContainer } = render(<AchievementCinematic {...goldProps} />);
      const goldFrags = goldContainer.querySelectorAll('[data-testid="shatter-fragment"]');
      expect(goldFrags).toHaveLength(0);

      const { container: platContainer } = render(<AchievementCinematic {...platinumProps} />);
      const platFrags = platContainer.querySelectorAll('[data-testid="shatter-fragment"]');
      expect(platFrags.length).toBeGreaterThan(0);
    });

    it('should render flash for Platinum only', () => {
      const { container: goldContainer } = render(<AchievementCinematic {...goldProps} />);
      const goldFlash = goldContainer.querySelectorAll('[data-testid="flash-effect"]');
      expect(goldFlash).toHaveLength(0);

      const { container: platContainer } = render(<AchievementCinematic {...platinumProps} />);
      const platFlash = platContainer.querySelectorAll('[data-testid="flash-effect"]');
      expect(platFlash.length).toBeGreaterThan(0);
    });
  });

  describe('constants', () => {
    it('should export correct duration', () => {
      expect(ACHIEVEMENT_DURATION_FRAMES).toBe(210);
    });
  });
});
