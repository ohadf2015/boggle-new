/**
 * BlastMpResults — the authoritative Blast multiplayer standings scene.
 *
 * The redesign's contract:
 *  - first place is unmistakable (winner hero shows the top name + champion label)
 *  - the current player is highlighted (YOU badge) AND their rank is pinned,
 *    even when they are not in the top 3
 *  - no always-zero stat boxes (tiles/combo were noise)
 *
 * Tests run with reduced-motion = true so the GSAP/Pixi garnish is skipped and
 * we assert on the rendered DOM contract only.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BlastMpResults from '../BlastMpResults';
import type { BlastMpPlayerResult } from '../blastMpRanking';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? key.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? '')) : key,
    language: 'en',
    dir: 'ltr' as const,
  }),
}));

// Reduced motion ON → component skips the Pixi backdrop + GSAP entrance.
vi.mock('framer-motion', () => ({ useReducedMotion: () => true }));

// Avatar pulls in contexts/SVG we don't need here.
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ userId }: { userId?: string }) =>
    React.createElement('div', { 'data-testid': 'avatar', 'data-user': userId }),
}));

// ScoreCountUp animates with rAF; render the final value synchronously.
vi.mock('@/components/results/shared', () => ({
  ScoreCountUp: ({ to }: { to: number }) =>
    React.createElement('span', null, String(to)),
}));

const make = (
  username: string,
  score: number,
  extra: Partial<BlastMpPlayerResult> = {},
): BlastMpPlayerResult => ({
  username,
  score,
  wordsFoundCount: 0,
  ...extra,
});

describe('BlastMpResults scene', () => {
  it('renders every player and shows the highest scorer as the winner', () => {
    render(
      <BlastMpResults
        results={[make('alice', 300), make('bob', 500), make('carol', 200)]}
        gameMode="blast"
      />,
    );
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('carol')).toBeInTheDocument();
    // Winner hero carries the champion label next to the top scorer.
    expect(screen.getByText('blast.mpResults.champion')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('marks the current player with a YOU badge', () => {
    render(
      <BlastMpResults
        results={[make('rival', 400), make('me', 250, { isCurrentPlayer: true })]}
        gameMode="blast"
      />,
    );
    expect(screen.getAllByText('results.you').length).toBeGreaterThan(0);
  });

  it('pins the current player position even when they are NOT in the top 3', () => {
    render(
      <BlastMpResults
        results={[
          make('p1', 900),
          make('p2', 800),
          make('p3', 700),
          make('me', 100, { isCurrentPlayer: true }),
          make('p5', 50),
        ]}
        gameMode="blast"
      />,
    );
    // Position chip exposes the rank label, and "#4" appears (chip + my own row).
    expect(screen.getByText('blast.mpResults.yourPosition')).toBeInTheDocument();
    expect(screen.getAllByText('#4').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('/ 5')).toBeInTheDocument();
  });

  it('shows the board-cleared badge for the player who cleared it', () => {
    render(
      <BlastMpResults
        results={[make('winner', 1000, { boardCleared: true })]}
        gameMode="blast"
      />,
    );
    expect(screen.getByText('blast.mpResults.boardCleared')).toBeInTheDocument();
  });

  it('renders an empty state when there are no results', () => {
    render(<BlastMpResults results={[]} gameMode="blast" />);
    expect(screen.getByText('mpModeBreakdown.emptyState')).toBeInTheDocument();
  });

  it('does not render the old always-zero tiles/combo stat boxes', () => {
    render(
      <BlastMpResults
        results={[make('solo', 500, { wordsFoundCount: 10, isCurrentPlayer: true })]}
        gameMode="blast"
      />,
    );
    // No "0x" combo noise.
    expect(screen.queryByText('0x')).not.toBeInTheDocument();
  });

  describe('collection comparison', () => {
    const breakdown = (coinPoints: number, diamondPoints: number, total: number) => ({ coinPoints, diamondPoints, total });
    const players = [
      make('alice', 900, { coinsCollected: 4, diamondsCollected: 3, scoreBreakdown: breakdown(40, 90, 900) }),
      make('bob', 700, { coinsCollected: 11, diamondsCollected: 1, scoreBreakdown: breakdown(110, 30, 700), isCurrentPlayer: true }),
      make('carol', 300, { coinsCollected: 2, diamondsCollected: 0 }),
    ];

    it('shows each player coin and diamond counts', () => {
      render(<BlastMpResults results={players} gameMode="blast" />);
      expect(screen.getByTestId('blast-mp-coins-bob')).toHaveTextContent('11');
      expect(screen.getByTestId('blast-mp-diamonds-alice')).toHaveTextContent('3');
      expect(screen.getByTestId('blast-mp-diamonds-carol')).toHaveTextContent('0');
    });

    it('shows the collection bonus converted to points only where a breakdown exists', () => {
      render(<BlastMpResults results={players} gameMode="blast" />);
      expect(screen.getByTestId('blast-mp-bonus-bob')).toHaveAttribute('data-points', '140');
      expect(screen.getByTestId('blast-mp-bonus-alice')).toHaveAttribute('data-points', '130');
      expect(screen.queryByTestId('blast-mp-bonus-carol')).toBeNull();
    });

    it('awards Coin king and Most diamonds to the top collectors', () => {
      render(<BlastMpResults results={players} gameMode="blast" />);
      expect(screen.getByTestId('blast-mp-award-coinKing')).toHaveAttribute('data-player', 'bob');
      expect(screen.getByTestId('blast-mp-award-mostDiamonds')).toHaveAttribute('data-player', 'alice');
    });

    it('hides counts, bonus and awards when the payload has no collection stats', () => {
      render(<BlastMpResults results={[make('x', 10), make('y', 5)]} gameMode="blast" />);
      expect(screen.queryByTestId('blast-mp-coins-x')).toBeNull();
      expect(screen.queryByTestId('blast-mp-bonus-x')).toBeNull();
      expect(screen.queryByTestId('blast-mp-award-coinKing')).toBeNull();
    });
  });
});
