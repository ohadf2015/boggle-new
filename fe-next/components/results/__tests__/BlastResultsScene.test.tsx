/**
 * BlastResultsScene Tests
 * Tests the unified Blast results scene component showing final scores and stats
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import BlastResultsScene from '../BlastResultsScene';
import type { BlastPlayerStats } from '@/shared/types/game';

// Mock LanguageContext
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
    alice: stats({
      maxCombo: 5,
      gemsCollected: 8,
      tilesCleared: 40,
      bestWord: 'BLASTER',
      boardClears: 2,
    }),
    bob: stats({
      maxCombo: 3,
      gemsCollected: 4,
      tilesCleared: 22,
      bestWord: 'WORD',
      boardClears: 0,
    }),
  };
  const scores = { alice: 1200, bob: 800 };

  it('renders every player with their final score', () => {
    render(
      <BlastResultsScene
        playerStats={playerStats}
        scores={scores}
        currentUsername="alice"
      />
    );
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
  });

  it('ranks the higher score first', () => {
    render(
      <BlastResultsScene
        playerStats={playerStats}
        scores={scores}
        currentUsername="bob"
      />
    );
    const rows = screen.getAllByTestId('blast-result-row');
    expect(rows[0]).toHaveTextContent('alice');
    expect(rows[1]).toHaveTextContent('bob');
  });

  it('surfaces best combo, gems, tiles cleared and board clears', () => {
    render(
      <BlastResultsScene
        playerStats={playerStats}
        scores={scores}
        currentUsername="alice"
      />
    );
    // Check that the labels appear at least once (they repeat for each player)
    const allByCombo = screen.getAllByText('blast.results.comboChain');
    const allByGems = screen.getAllByText('blast.results.gemsCollected');
    const allByTiles = screen.getAllByText('blast.results.tilesCleared');
    const allByBoardClears = screen.getAllByText('blast.results.boardClears');
    expect(allByCombo.length).toBeGreaterThan(0);
    expect(allByGems.length).toBeGreaterThan(0);
    expect(allByTiles.length).toBeGreaterThan(0);
    expect(allByBoardClears.length).toBeGreaterThan(0);
  });

  it('surfaces best word when present', () => {
    const singlePlayer = {
      alice: stats({ maxCombo: 5, gemsCollected: 8, tilesCleared: 40, bestWord: 'BLASTER', boardClears: 2 }),
    };
    const singleScores = { alice: 1200 };
    render(
      <BlastResultsScene
        playerStats={singlePlayer}
        scores={singleScores}
        currentUsername="alice"
      />
    );
    expect(screen.getByText('BLASTER')).toBeInTheDocument();
    expect(screen.getByText('blast.results.bestWord:')).toBeInTheDocument();
  });

  it('renders without crashing with single player', () => {
    const singlePlayer = {
      alice: stats({ maxCombo: 5, gemsCollected: 8, tilesCleared: 40, bestWord: 'TEST', boardClears: 1 }),
    };
    const singleScores = { alice: 1200 };
    const { container } = render(
      <BlastResultsScene
        playerStats={singlePlayer}
        scores={singleScores}
        currentUsername="alice"
      />
    );
    expect(container).toBeTruthy();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('renders without crashing with empty players', () => {
    const { container } = render(
      <BlastResultsScene
        playerStats={{}}
        scores={{}}
        currentUsername="alice"
      />
    );
    expect(container).toBeTruthy();
  });

  it('displays scene title', () => {
    render(
      <BlastResultsScene
        playerStats={playerStats}
        scores={scores}
        currentUsername="alice"
      />
    );
    expect(screen.getByText('blast.results.sceneTitle')).toBeInTheDocument();
  });
});
