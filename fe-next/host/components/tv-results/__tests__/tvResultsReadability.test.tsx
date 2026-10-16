import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const MOTION_PROPS = new Set(['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout', 'variants']);
  const make = (tag: string) => {
    const C = React.forwardRef<HTMLElement, Record<string, unknown>>(({ children, ...props }, ref) => {
      const dom = Object.fromEntries(Object.entries(props).filter(([k]) => !MOTION_PROPS.has(k)));
      return React.createElement(tag, { ref, ...dom }, children as React.ReactNode);
    });
    C.displayName = `m.${tag}`;
    return C;
  };
  const m = new Proxy({}, { get: (_t, tag: string) => make(tag) });
  return {
    m,
    AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
    MotionConfig: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => false,
    useMotionValue: () => ({ get: () => 0, set: () => {} }),
    useTransform: () => ({ on: () => () => {} }),
    animate: () => ({ stop: () => {} }),
  };
});

vi.mock('../../../../components/Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}));
vi.mock('../../../../utils/confettiUtils', () => ({ fireRankConfetti: vi.fn() }));

import TvResultsWinnersPodium from '../TvResultsWinnersPodium';
import TvResultsStatsGrid from '../TvResultsStatsGrid';
import TvResultsAwards from '../TvResultsAwards';
import TvResultsPlayerSpotlight from '../TvResultsPlayerSpotlight';
import TvResultsControls from '../TvResultsControls';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const LONG = 'Grid Gazer Bot 33';

const word = (w: string, at: number, score = 3) => ({ word: w, score, validated: true, isDuplicate: false, timeSinceStart: at });

const players = [
  { username: LONG, score: 445, allWords: ['IMAGINE', 'STEAM', 'MEAT', 'TEAM', 'MATE', 'GAME', 'MAGE', 'GEM', 'TAME', 'MITE'].map((w, i) => word(w, 2 + i * 14, 5)) },
  { username: 'Newbie Bot Seventeen', score: 129, allWords: ['SEAT', 'EAT', 'TEA', 'ATE', 'SAT'].map((w, i) => word(w, 5 + i * 30)) },
  { username: 'Third Place Person', score: 90, allWords: ['TIE', 'SIT'].map((w, i) => word(w, 40 + i * 30)) },
];

const noEllipsis = (el: HTMLElement) => {
  expect(el.className).not.toMatch(/\btruncate\b|\bline-clamp-|\btext-ellipsis\b/);
};

describe('results wall never ellipsizes names or words', () => {
  it('podium names wrap instead of truncating, on a solid plate with no blurred shadow', () => {
    render(<TvResultsWinnersPodium players={players.map(p => ({ ...p, wordCount: p.allWords.length }))} show1st show2nd show3rd showConfetti={false} t={t} />);
    for (const rank of [1, 2, 3]) {
      const name = screen.getByTestId(`podium-name-${rank}`);
      noEllipsis(name);
      expect(name.getAttribute('style') ?? '').not.toMatch(/text-shadow/);
    }
    expect(screen.getByTestId('podium-name-1')).toHaveTextContent(LONG);
  });

  it('stat values and their players wrap instead of truncating', () => {
    render(<TvResultsStatsGrid players={players} visible t={t} />);
    noEllipsis(screen.getByTestId('stat-value-longest-word'));
    expect(screen.getByTestId('stat-value-longest-word')).toHaveTextContent('IMAGINE');
    noEllipsis(screen.getByTestId('stat-player-longest-word'));
    noEllipsis(screen.getByTestId('stat-value-first-strike'));
  });

  it('award recipients wrap and the icon badge sits inside the card', () => {
    render(<TvResultsAwards players={players} visible gameDuration={180} t={t} />);
    const cards = screen.getAllByTestId(/^award-card-/);
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      noEllipsis(within(card).getByTestId('award-recipient'));
      expect(within(card).getByTestId('award-badge').className).not.toMatch(/-(?:top|right|left|start|end)-/);
    }
  });

  it('spotlight names wrap and the wall shows at most four cards', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ username: `${LONG} ${i}`, score: 100 - i, allWords: [] }));
    render(<TvResultsPlayerSpotlight players={many} visible gameDuration={180} t={t} />);
    const names = screen.getAllByTestId('spotlight-name');
    expect(names).toHaveLength(4);
    names.forEach(noEllipsis);
    expect(screen.getByText(/tvResults\.spotlight\.andMorePlural/)).toBeInTheDocument();
  });
});

describe('results dock', () => {
  const base = {
    visible: true, isAnimating: false, isTournament: false, isLastRound: true,
    playersReadyCount: 1, totalPlayers: 2,
    onSkip: vi.fn(), onStartNewGame: vi.fn(), onNextRound: vi.fn(), onShowQR: vi.fn(), t,
  };

  it('shows every player with a ready mark, bots counted as ready', () => {
    render(
      <TvResultsControls
        {...base}
        readyPlayers={[
          { username: 'Maya', ready: true },
          { username: 'Noa', ready: false },
          { username: LONG, ready: true, isBot: true },
        ]}
      />
    );
    const strip = screen.getByTestId('tv-results-ready-strip');
    expect(within(strip).getAllByTestId('ready-player')).toHaveLength(3);
    expect(within(strip).getByTestId('ready-count')).toHaveTextContent('2/3');
  });
});
