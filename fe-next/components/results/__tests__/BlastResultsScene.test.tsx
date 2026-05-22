/**
 * BlastResultsScene Tests
 *
 * The scene is current-user-focused: the player who just played gets an
 * emphasized block with their full Blast stats + placement, while opponents
 * are condensed into compact ranked rows (name + score + peak combo) so the
 * screen isn't a wall of every rival's stat grid.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import BlastResultsScene from '../BlastResultsScene';
import type { BlastPlayerStats } from '@/shared/types/game';

// Mock LanguageContext — t() echoes the key so we can assert on keys directly.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  // eslint-disable-next-line react/display-name
  const MotionDiv = React.forwardRef(
    ({ children, initial, animate, exit, variants, whileHover, whileTap, transition, ...rest }: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...rest, ref }, children)
  );
  return {
    m: new Proxy({}, {
      get: (_target: Record<string, unknown>, prop: string) => {
        if (prop === 'div') return MotionDiv;
        // eslint-disable-next-line react/display-name
        return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
          const { initial, animate, exit, variants, whileHover, whileTap, transition, ...rest } = props;
          return React.createElement(prop, { ...rest, ref });
        });
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => false,
  };
});

// Mock ScoreCountUp to render the number directly
vi.mock('@/components/results/shared', () => ({
  ScoreCountUp: ({ to }: { to: number }) => React.createElement('span', null, String(to)),
}));

const stats = (over: Partial<BlastPlayerStats>): BlastPlayerStats => ({
  maxCombo: 0,
  gemsCollected: 0,
  wordsFound: [],
  bestWord: '',
  tilesCleared: 0,
  totalTileBonus: 0,
  boardClears: 0,
  ...over,
});

describe('BlastResultsScene', () => {
  const playerStats: Record<string, BlastPlayerStats> = {
    alice: stats({ maxCombo: 5, gemsCollected: 8, tilesCleared: 40, bestWord: 'BLASTER', boardClears: 2 }),
    bob: stats({ maxCombo: 3, gemsCollected: 4, tilesCleared: 22, bestWord: 'WORD', boardClears: 0 }),
  };
  const scores = { alice: 1200, bob: 800 };

  const renderScene = (
    currentUsername: string,
    ps: Record<string, BlastPlayerStats> = playerStats,
    sc: Record<string, number> = scores,
  ) => render(<BlastResultsScene playerStats={ps} scores={sc} currentUsername={currentUsername} />);

  it('elevates the current user blast stats into their own emphasized block', () => {
    renderScene('bob');
    const me = screen.getByTestId('blast-result-me');
    expect(me).toHaveTextContent('results.you'); // the YOU marker
  });

  it('shows the current user full blast stat grid in their block', () => {
    renderScene('bob');
    const me = screen.getByTestId('blast-result-me');
    expect(within(me).getByText('blast.results.comboChain')).toBeInTheDocument();
    expect(within(me).getByText('blast.results.gemsCollected')).toBeInTheDocument();
    expect(within(me).getByText('blast.results.tilesCleared')).toBeInTheDocument();
    expect(within(me).getByText('blast.results.boardClears')).toBeInTheDocument();
  });

  it('does not repeat the score/placement already shown by the shared results hero', () => {
    // The hero above this scene owns rank + score + username; the blast scene
    // only contributes the blast-specific stat grid, so it must not duplicate
    // the score (avoids the "stacked me-card" redundancy).
    renderScene('bob');
    const me = screen.getByTestId('blast-result-me');
    expect(me).not.toHaveTextContent('800');
  });

  it('renders opponents as compact rows without the full stat grid', () => {
    renderScene('bob');
    const opponents = screen.getAllByTestId('blast-result-opponent');
    expect(opponents).toHaveLength(1);
    expect(opponents[0]).toHaveTextContent('alice');
    expect(opponents[0]).toHaveTextContent('1200');
    // decluttered: opponent rows don't repeat the four stat labels
    expect(within(opponents[0]).queryByText('blast.results.gemsCollected')).toBeNull();
    expect(within(opponents[0]).queryByText('blast.results.boardClears')).toBeNull();
    expect(within(opponents[0]).queryByText('blast.results.tilesCleared')).toBeNull();
  });

  it('ranks opponents by score descending with their true placement number', () => {
    const three = { ...playerStats, carol: stats({ maxCombo: 1 }) };
    const threeScores = { alice: 1200, bob: 800, carol: 1500 };
    renderScene('bob', three, threeScores);
    const opponents = screen.getAllByTestId('blast-result-opponent');
    expect(opponents[0]).toHaveTextContent('carol'); // #1 — 1500
    expect(opponents[0]).toHaveTextContent('#1');
    expect(opponents[1]).toHaveTextContent('alice'); // #2 — 1200
    expect(opponents[1]).toHaveTextContent('#2');
  });

  it('surfaces the current user best word in their block', () => {
    renderScene('alice');
    expect(screen.getByTestId('blast-result-me')).toHaveTextContent('BLASTER');
  });

  it('shows only the me-block when the current user is the only player', () => {
    renderScene('alice', { alice: playerStats.alice }, { alice: 1200 });
    expect(screen.getByTestId('blast-result-me')).toBeInTheDocument();
    expect(screen.queryAllByTestId('blast-result-opponent')).toHaveLength(0);
  });

  it('renders without crashing with empty players', () => {
    const { container } = render(
      <BlastResultsScene playerStats={{}} scores={{}} currentUsername="alice" />
    );
    expect(container).toBeTruthy();
  });

  it('falls back to ranked opponent rows when the current user is absent (spectator)', () => {
    renderScene('zoe');
    expect(screen.queryByTestId('blast-result-me')).toBeNull();
    expect(screen.getAllByTestId('blast-result-opponent')).toHaveLength(2);
  });

  it('displays the scene title', () => {
    renderScene('alice');
    expect(screen.getByText('blast.results.sceneTitle')).toBeInTheDocument();
  });
});
