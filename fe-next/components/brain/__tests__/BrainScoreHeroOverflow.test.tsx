import React from 'react';
import { render, screen } from '@testing-library/react';
import BrainScoreHero from '../BrainScoreHero';

// Mock dependencies
vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'brain.score': 'Brain Score',
        'brain.activitiesAnalyzed': 'Activities',
        'brain.tiers.intermediate': 'Intermediate',
        'brain.toNextTier': 'to',
        'brain.tiers.advanced': 'Advanced',
        'brain.pointsToGo': 'pts to go',
        'brain.maxTierReached': 'Max Tier!',
        'common.share': 'Share',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <span className={className} {...props}>{children}</span>
    ),
    button: ({ children, className, onClick, ...props }: React.PropsWithChildren<{ className?: string; onClick?: () => void }>) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
  },
}));

describe('BrainScoreHero UI Fixes', () => {
  const defaultProps = {
    score: 47,
    tier: 'intermediate' as const,
    tierProgress: 47,
    gamesAnalyzed: 10,
    drillsCompleted: 5,
    onShare: vi.fn(),
  };

  describe('Activities counter responsive design', () => {
    it('should have responsive padding for mobile-first design', () => {
      const { container } = render(<BrainScoreHero {...defaultProps} />);

      // Find the activities badge container (has the activities count)
      const badges = container.querySelectorAll('[class*="rounded-neo"][class*="border-2"]');

      // Find the one containing the activities text
      const foundBadge = Array.from(badges).find((badge) =>
        badge.textContent?.includes('Activities') || badge.textContent?.includes('15')
      );

      expect(foundBadge).toBeTruthy();
      // Should have responsive padding classes (mobile-first: px-2, desktop: sm:px-3)
      expect((foundBadge as Element).className).toMatch(/px-2/);
      expect((foundBadge as Element).className).toMatch(/sm:px-3/);
    });

    it('should use responsive text sizes for activities count', () => {
      const { container } = render(<BrainScoreHero {...defaultProps} />);

      // The activities count should use responsive text sizes (mobile: text-lg, desktop: sm:text-xl)
      const activitiesCount = screen.getByText('15');
      expect(activitiesCount.className).toMatch(/text-lg/);
      expect(activitiesCount.className).toMatch(/sm:text-xl/);
    });
  });

  describe('Progress bar visibility fix', () => {
    it('should have adequate height for the progress bar', () => {
      const { container } = render(<BrainScoreHero {...defaultProps} />);

      // Find the progress bar container by looking for the rounded-full element
      const progressBar = container.querySelector('[class*="rounded-full"][class*="border-2"]');
      expect(progressBar).toBeTruthy();

      // Should have h-4 or h-5 for better visibility, not h-3
      expect(progressBar?.className).toMatch(/h-[45]/);
      expect(progressBar?.className).not.toMatch(/h-3\s|h-3$/);
    });

    it('should have higher contrast background for progress bar in dark mode', () => {
      const { container } = render(<BrainScoreHero {...defaultProps} />);

      // Find the progress bar container
      const progressBar = container.querySelector('[class*="rounded-full"][class*="border-2"]');
      expect(progressBar).toBeTruthy();

      // Should use darker background (slate-900) for more contrast in dark mode
      expect(progressBar?.className).toMatch(/bg-neo-navy/);
    });
  });

  describe('Points to next tier display', () => {
    it('should show current score under progress bar', () => {
      render(<BrainScoreHero {...defaultProps} />);

      // Current score should be displayed as a marker under the progress bar
      expect(screen.getAllByText('47').length).toBeGreaterThanOrEqual(1);
    });

    it('should show points needed to reach next tier', () => {
      render(<BrainScoreHero {...defaultProps} />);

      // For intermediate tier (max 59), with score 47, should show "13 pts to go"
      // tierConfig.max + 1 - score = 59 + 1 - 47 = 13
      expect(screen.getByText(/13.*pts to go/)).toBeInTheDocument();
    });

    it('should show next tier threshold score', () => {
      render(<BrainScoreHero {...defaultProps} />);

      // Should show 60 (next tier threshold: max of current tier + 1)
      expect(screen.getByText('60')).toBeInTheDocument();
    });

    it('should show max tier message when at master level', () => {
      const masterProps = {
        ...defaultProps,
        score: 95,
        tier: 'master' as const,
        tierProgress: 50,
      };
      render(<BrainScoreHero {...masterProps} />);

      // Should show max tier message instead of points to go
      expect(screen.getByText('Max Tier!')).toBeInTheDocument();
    });
  });
});
