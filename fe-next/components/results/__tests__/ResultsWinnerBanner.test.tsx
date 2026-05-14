import React from 'react';
import { render, screen } from '@testing-library/react';
import ResultsWinnerBanner from '../ResultsWinnerBanner';

// Mock useLanguage hook
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion with ScoreCounter support
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: () => {},
    on: () => () => {},
  }),
  useTransform: (_val: unknown, fn: (v: number) => number) => ({
    get: () => fn(0),
    on: (_event: string, cb: (v: number) => void) => { cb(0); return () => {}; },
  }),
  animate: () => ({ stop: () => {} }),
}));

// Mock confetti
vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
}));

// Mock Mascot components
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ className }: { className?: string }) => (
    <div data-testid="mascot" className={className}>Mascot</div>
  ),
  MascotVariant: {},
}));

vi.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: ({ className }: { className?: string }) => (
    <div data-testid="mascot" className={className}>CelebrationMascot</div>
  ),
}));

describe('ResultsWinnerBanner', () => {
  const mockWinner = {
    username: 'TestPlayer',
    score: 150,
  };

  describe('default mode', () => {
    it('renders winner name and score label', () => {
      render(
        <ResultsWinnerBanner
          winner={mockWinner}
          isCurrentUserWinner={true}
        />
      );

      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
      // Score is rendered via ScoreCounter (mocked to display 0) + points label
      expect(screen.getByText('results.points')).toBeInTheDocument();
    });

    it('shows mascot by default', () => {
      render(
        <ResultsWinnerBanner
          winner={mockWinner}
          isCurrentUserWinner={true}
        />
      );

      expect(screen.getByTestId('mascot')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('renders with reduced padding in compact mode', () => {
      const { container } = render(
        <ResultsWinnerBanner
          winner={mockWinner}
          isCurrentUserWinner={true}
          compact={true}
        />
      );

      // Check for compact padding class (px-3 py-2.5)
      const contentDiv = container.querySelector('.px-3');
      expect(contentDiv).toBeInTheDocument();
    });

    it('shows scaled-down mascot in compact mode', () => {
      const { container } = render(
        <ResultsWinnerBanner
          winner={mockWinner}
          isCurrentUserWinner={true}
          compact={true}
        />
      );

      // Mascot should be present but scaled down
      expect(screen.queryByTestId('mascot')).toBeInTheDocument();
      // Container should have scale-75 for compact
      const mascotContainer = container.querySelector('.scale-75');
      expect(mascotContainer).toBeInTheDocument();
    });

    it('uses smaller text sizes in compact mode', () => {
      render(
        <ResultsWinnerBanner
          winner={mockWinner}
          isCurrentUserWinner={true}
          compact={true}
        />
      );

      const username = screen.getByText('TestPlayer');
      expect(username).toHaveClass('text-base');
    });
  });
});
