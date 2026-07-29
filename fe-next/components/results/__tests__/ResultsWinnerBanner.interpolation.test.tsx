/**
 * ResultsWinnerBanner Interpolation Tests
 *
 * Tests that the yourPlace translation is called with correct parameters
 * for 4th+ place players.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Capture t() calls to verify interpolation parameters
const tCalls: Array<{ key: string; params?: Record<string, unknown> }> = [];

// Mock contexts with parameter tracking
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      tCalls.push({ key, params });
      if (key === 'results.yourPlace' && params) {
        // Simulate the real translation with interpolation
        return `${params.place} of ${params.total}`;
      }
      if (key === 'results.yourPlaceSimple' && params) {
        return `#${params.place}`;
      }
      return key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, onClick, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div className={className as string} style={style as React.CSSProperties} onClick={onClick as React.MouseEventHandler} {...rest}>
        {children}
      </div>
    ),
    span: ({ children, className, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span className={className as string} {...rest}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
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

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />;
  },
}));

// Mock confetti utility
vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
}));

// Mock Avatar component
vi.mock('../../Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar">Avatar</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Crown: () => <span data-testid="crown-icon">Crown</span>,
  Trophy: () => <span data-testid="trophy-icon">Trophy</span>,
  Medal: () => <span data-testid="medal-icon">Medal</span>,
  Hand: () => <span data-testid="hand-icon">Hand</span>,
}));

// Mock Mascot component
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: () => <div data-testid="mascot">Mascot</div>,
  MascotVariant: {},
}));

vi.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: () => <div data-testid="mascot">CelebrationMascot</div>,
}));

import ResultsWinnerBanner from '../ResultsWinnerBanner';

const createWinner = (username: string, score: number) => ({
  username,
  score,
  avatar: { emoji: '😀', color: '#FF0000' },
});

describe('ResultsWinnerBanner Interpolation', () => {
  beforeEach(() => {
    tCalls.length = 0;
  });

  describe('yourPlace translation for 4th+ place', () => {
    it('should call t() with place and total parameters for 5th place', () => {
      render(
        <ResultsWinnerBanner
          winner={createWinner('Fifth', 50)}
          isCurrentUserWinner={true}
          rank={5}
          totalPlayers={8}
        />
      );

      // Find the call to results.yourPlace
      const yourPlaceCall = tCalls.find(call => call.key === 'results.yourPlace');
      expect(yourPlaceCall).toBeDefined();
      expect(yourPlaceCall?.params).toEqual({ place: 5, total: 8 });
    });

    it('should render the interpolated text correctly', () => {
      render(
        <ResultsWinnerBanner
          winner={createWinner('Fifth', 50)}
          isCurrentUserWinner={true}
          rank={5}
          totalPlayers={8}
        />
      );

      // The announcement text should show interpolated "5 of 8"
      expect(screen.getByText('5 of 8')).toBeInTheDocument();
    });

    it('should use fallback when totalPlayers is not provided', () => {
      render(
        <ResultsWinnerBanner
          winner={createWinner('Fourth', 60)}
          isCurrentUserWinner={true}
          rank={4}
          // No totalPlayers provided
        />
      );

      // Should use the i18n fallback for placement without total
      expect(screen.getByText('#4')).toBeInTheDocument();
    });
  });
});
