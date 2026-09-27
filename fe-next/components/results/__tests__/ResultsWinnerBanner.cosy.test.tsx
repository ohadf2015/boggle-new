import React from 'react';
import { render, screen } from '@testing-library/react';
import ResultsWinnerBanner from '../ResultsWinnerBanner';

/**
 * Cozy / Calm Mode must quiet the results banner's PERPETUAL celebration loops
 * (the infinite accent-glow border + the looping score shimmer). These run on
 * `repeat: Infinity` and are gated only on the OS `prefers-reduced-motion` flag
 * — which the in-app cozy audience almost never sets — so without an explicit
 * cosy gate they'd loop forever right in the cozy player's face. One-shot
 * reveals and the confetti→quiet-feedback path are intentionally untouched.
 */

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  useMotionValue: (initial: number) => ({ get: () => initial, set: () => {}, on: () => () => {} }),
  useTransform: (_val: unknown, fn: (v: number) => number) => ({
    get: () => fn(0),
    on: (_e: string, cb: (v: number) => void) => { cb(0); return () => {}; },
  }),
  animate: () => ({ stop: () => {} }),
}));

vi.mock('@/utils/confettiUtils', () => ({ fireRankConfetti: vi.fn() }));
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ className }: { className?: string }) => <div data-testid="mascot" className={className} />,
  MascotVariant: {},
}));
vi.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: ({ className }: { className?: string }) => <div data-testid="mascot" className={className} />,
}));

let cosyOn = false;
vi.mock('@/contexts/AccessibilityContext', () => ({ useCosyMode: () => cosyOn }));

const winner = { username: 'TestPlayer', score: 150 };

describe('ResultsWinnerBanner — cozy quiets perpetual loops', () => {
  beforeEach(() => { cosyOn = false; });

  it('loud mode (rank 1): perpetual glow + score shimmer loops render', () => {
    cosyOn = false;
    render(<ResultsWinnerBanner winner={winner} rank={1} variant="ranking" />);
    expect(screen.getByTestId('winner-glow-loop')).toBeInTheDocument();
    expect(screen.getByTestId('winner-score-shimmer')).toBeInTheDocument();
  });

  it('cozy mode: NEITHER perpetual loop renders (calm, no infinite motion)', () => {
    cosyOn = true;
    render(<ResultsWinnerBanner winner={winner} rank={1} variant="ranking" />);
    expect(screen.queryByTestId('winner-glow-loop')).not.toBeInTheDocument();
    expect(screen.queryByTestId('winner-score-shimmer')).not.toBeInTheDocument();
  });

  it('cozy mode: the banner still shows the player + score (calm, not gutted)', () => {
    cosyOn = true;
    render(<ResultsWinnerBanner winner={winner} rank={1} variant="ranking" />);
    expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    expect(screen.getByText('results.points')).toBeInTheDocument();
  });
});
