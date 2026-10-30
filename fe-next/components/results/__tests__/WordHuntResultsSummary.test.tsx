/**
 * WordHuntResultsSummary Tests
 *
 * WHRS owns the target word + survival highlight, elimination-order chips and
 * tip badges. Per-player standings belong to the results stage.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import WordHuntResultsSummary from '../WordHuntResultsSummary';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const makeMotion = (_target: Record<string, unknown>, prop: string) => {
    // eslint-disable-next-line react/display-name
    const Comp = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
      const { initial, animate, exit, variants, whileHover, whileTap, transition, ...rest } = props;
      return React.createElement(prop, { ...rest, ref });
    });
    return Comp;
  };
  return {
    ...vi.importActual('framer-motion'),
    useReducedMotion: () => true,
    m: new Proxy({}, { get: makeMotion }),
  };
});

const baseProps = {
  targetWord: 'PUZZLE',
  foundTarget: true,
  isFirstFinder: false,
  survivalTime: 120,
  discoveryWords: 8,
};

const playerResults = [
  { username: 'Alice', score: 150, survived: true, lifeRemaining: 80, validWordCount: 20, invalidWordCount: 2, avgWordLength: 5, longestWordLength: 8 },
  { username: 'Bob', score: 120, survived: true, lifeRemaining: 45, validWordCount: 15, invalidWordCount: 3, avgWordLength: 4, longestWordLength: 7 },
  { username: 'Charlie', score: 90, survived: false, lifeRemaining: 0, validWordCount: 10, invalidWordCount: 5, avgWordLength: 3.5, longestWordLength: 6 },
  { username: 'Dave', score: 60, survived: false, lifeRemaining: 0, validWordCount: 5, invalidWordCount: 4, avgWordLength: 3, longestWordLength: 5 },
];

describe('WordHuntResultsSummary', () => {
  describe('dedup invariants', () => {
    it('shows the target word beside the survival time (the MP hero that showed it is gone)', () => {
      render(<WordHuntResultsSummary {...baseProps} />);
      const target = screen.getByTestId('word-hunt-target');
      expect(target).toHaveTextContent('results.target');
      expect(target).toHaveTextContent('PUZZLE');
    });

    it('omits the target cell when the server sent no target word', () => {
      render(<WordHuntResultsSummary {...baseProps} targetWord="" />);
      expect(screen.queryByTestId('word-hunt-target')).not.toBeInTheDocument();
    });

    it('does NOT render found / first-finder / not-found badges (owned by Hero)', () => {
      render(<WordHuntResultsSummary {...baseProps} foundTarget={true} isFirstFinder={true} />);
      expect(screen.queryByTestId('target-found-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('target-first-finder-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('target-not-found-badge')).not.toBeInTheDocument();
    });

    it('does NOT render match-summary rows (owned by ResultsPodium + ConsolationRows)', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.queryByText('wordHunt.results.matchSummary')).not.toBeInTheDocument();
      expect(screen.queryByTestId('match-summary-Alice')).not.toBeInTheDocument();
      expect(screen.queryByTestId('match-summary-Charlie')).not.toBeInTheDocument();
    });

    it('does NOT render words-found stat in highlight bar (owned by HighlightsBar/Hero)', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.queryByText('results.words')).not.toBeInTheDocument();
    });
  });

  describe('survival highlight', () => {
    it('shows formatted survival time', () => {
      render(<WordHuntResultsSummary {...baseProps} survivalTime={95} />);
      // 95 seconds = 01:35
      expect(screen.getByText('01:35')).toBeInTheDocument();
    });

    it('shows survival label', () => {
      render(<WordHuntResultsSummary {...baseProps} />);
      expect(screen.getByText('wordHunt.multiplayer.survivalTime')).toBeInTheDocument();
    });
  });

  describe('elimination history', () => {
    it('shows elimination history header when eliminated players exist', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.getByText('wordHunt.results.eliminationHistory')).toBeInTheDocument();
    });

    it('renders one chip per eliminated player', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.getByTestId('eliminated-row-Charlie')).toBeInTheDocument();
      expect(screen.getByTestId('eliminated-row-Dave')).toBeInTheDocument();
    });

    it('does not render header when nobody was eliminated', () => {
      const allSurvived = [
        { username: 'Alice', score: 150, survived: true, lifeRemaining: 80 },
        { username: 'Bob', score: 120, survived: true, lifeRemaining: 45 },
      ];
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={allSurvived}
          currentUsername="Alice"
        />
      );
      expect(screen.queryByText('wordHunt.results.eliminationHistory')).not.toBeInTheDocument();
    });
  });

  describe('tip badge', () => {
    it('shows tip badge for current eliminated user', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Charlie"
        />
      );
      expect(screen.getByTestId('word-hunt-tip')).toBeInTheDocument();
    });

    it('shows tip badge for current surviving user', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.getByTestId('word-hunt-tip')).toBeInTheDocument();
    });
  });

  describe('no player results', () => {
    it('still renders survival highlight even without playerResults', () => {
      render(<WordHuntResultsSummary {...baseProps} />);
      expect(screen.getByText('wordHunt.multiplayer.survivalTime')).toBeInTheDocument();
    });
  });
});
