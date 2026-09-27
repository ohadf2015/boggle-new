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

// Mock framer-motion
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

// Mock Mascot — capture the variant prop via data-variant attribute
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant, className }: { variant?: string; className?: string }) => (
    <div data-testid="mascot-with-entrance" data-variant={variant} className={className}>Mascot</div>
  ),
  MascotVariant: {},
}));

vi.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: ({ className }: { className?: string }) => (
    <div data-testid="celebration-mascot" className={className}>CelebrationMascot</div>
  ),
}));

describe('ResultsWinnerBanner mascot variants', () => {
  // GIVEN a player with rank > 3 and a decent score
  // WHEN the banner renders
  // THEN the mascot variant should be 'encouraging'
  it('should show encouraging mascot for non-podium players with decent score', () => {
    render(
      <ResultsWinnerBanner
        winner={{ username: 'Player4', score: 80 }}
        isCurrentUserWinner={false}
        rank={4}
        totalPlayers={6}
      />
    );

    const mascot = screen.getByTestId('mascot-with-entrance');
    expect(mascot).toHaveAttribute('data-variant', 'encouraging');
  });

  // GIVEN a player in last place (rank === totalPlayers, totalPlayers > 2)
  // WHEN the banner renders
  // THEN the mascot variant should be 'crying'
  it('should show crying mascot for last place player', () => {
    render(
      <ResultsWinnerBanner
        winner={{ username: 'LastPlace', score: 30 }}
        isCurrentUserWinner={false}
        rank={5}
        totalPlayers={5}
      />
    );

    const mascot = screen.getByTestId('mascot-with-entrance');
    expect(mascot).toHaveAttribute('data-variant', 'crying');
  });

  // GIVEN a player in last place in a 2-player game
  // WHEN the banner renders
  // THEN the mascot should NOT show crying (totalPlayers must be > 2)
  it('should not show crying mascot in a 2-player game for last place', () => {
    render(
      <ResultsWinnerBanner
        winner={{ username: 'Player2', score: 40 }}
        isCurrentUserWinner={false}
        rank={2}
        totalPlayers={2}
      />
    );

    // rank 2 in a 2-player game uses CelebrationMascot (podium), not MascotWithEntrance
    // So this player gets celebration mascot since rank <= 3
    expect(screen.getByTestId('celebration-mascot')).toBeInTheDocument();
  });

  // GIVEN a completion variant (uses MascotWithEntrance, not CelebrationMascot)
  // WHEN the banner renders
  // THEN the mascot variant should be 'thinking'
  it('should show thinking mascot for completion variant', () => {
    render(
      <ResultsWinnerBanner
        winner={{ username: 'Player', score: 50 }}
        isCurrentUserWinner={false}
        variant="completion"
        rank={4}
        totalPlayers={4}
      />
    );

    const mascot = screen.getByTestId('mascot-with-entrance');
    expect(mascot).toHaveAttribute('data-variant', 'thinking');
  });

  // GIVEN a player with zero score
  // WHEN the banner renders
  // THEN the mascot variant should be 'oops'
  it('should show oops mascot for zero score', () => {
    render(
      <ResultsWinnerBanner
        winner={{ username: 'ZeroPlayer', score: 0 }}
        isCurrentUserWinner={false}
        rank={4}
        totalPlayers={4}
      />
    );

    const mascot = screen.getByTestId('mascot-with-entrance');
    expect(mascot).toHaveAttribute('data-variant', 'oops');
  });

  // GIVEN rank 1 winner
  // WHEN banner renders
  // THEN CelebrationMascot is shown (podium uses CelebrationMascot, not MascotWithEntrance)
  it('should show celebration mascot for 1st place', () => {
    render(
      <ResultsWinnerBanner
        winner={{ username: 'Winner', score: 200 }}
        isCurrentUserWinner={true}
        rank={1}
        totalPlayers={4}
      />
    );

    expect(screen.getByTestId('celebration-mascot')).toBeInTheDocument();
  });

  // GIVEN last place in a 6-player game but with zero score
  // WHEN banner renders
  // THEN oops takes priority over crying (zero score check comes first)
  it('should prioritize oops over crying for zero score last place', () => {
    render(
      <ResultsWinnerBanner
        winner={{ username: 'LastZero', score: 0 }}
        isCurrentUserWinner={false}
        rank={6}
        totalPlayers={6}
      />
    );

    const mascot = screen.getByTestId('mascot-with-entrance');
    expect(mascot).toHaveAttribute('data-variant', 'oops');
  });
});
