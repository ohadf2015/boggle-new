import React from 'react';
import { render, screen } from '@testing-library/react';
import ResultsWinnerBanner from '../ResultsWinnerBanner';

// Mock useLanguage hook
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
}));

// Mock confetti
jest.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: jest.fn(),
}));

// Mock Mascot components
jest.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ className }: { className?: string }) => (
    <div data-testid="mascot" className={className}>Mascot</div>
  ),
  MascotVariant: {},
}));

jest.mock('@/components/ui/CelebrationMascot', () => ({
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
    it('renders winner name and score', () => {
      render(
        <ResultsWinnerBanner
          winner={mockWinner}
          isCurrentUserWinner={true}
        />
      );

      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
      expect(screen.getByText(/150/)).toBeInTheDocument();
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

      // Check for compact padding class
      const contentDiv = container.querySelector('.p-2');
      expect(contentDiv).toBeInTheDocument();
    });

    it('hides mascot in compact mode', () => {
      render(
        <ResultsWinnerBanner
          winner={mockWinner}
          isCurrentUserWinner={true}
          compact={true}
        />
      );

      // Mascot should not be present
      expect(screen.queryByTestId('mascot')).not.toBeInTheDocument();
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
      expect(username).toHaveClass('text-lg');
    });
  });
});
