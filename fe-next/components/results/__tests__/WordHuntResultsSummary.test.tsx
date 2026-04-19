/**
 * WordHuntResultsSummary Tests
 * Tests the word hunt mode results summary component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import WordHuntResultsSummary from '../WordHuntResultsSummary';

// Mock translations
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
    motion: new Proxy({}, { get: makeMotion }),
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
  it('should show the target word prominently', () => {
    render(<WordHuntResultsSummary {...baseProps} />);
    expect(screen.getByTestId('target-word-hero')).toBeInTheDocument();
    expect(screen.getByText('PUZZLE')).toBeInTheDocument();
  });

  it('should show FOUND badge when target was found', () => {
    render(<WordHuntResultsSummary {...baseProps} foundTarget={true} isFirstFinder={false} />);
    expect(screen.getByTestId('target-found-badge')).toBeInTheDocument();
  });

  it('should show NOT FOUND badge when target was not found', () => {
    render(<WordHuntResultsSummary {...baseProps} foundTarget={false} />);
    expect(screen.getByTestId('target-not-found-badge')).toBeInTheDocument();
  });

  it('should show first finder badge when current user found the target first', () => {
    render(<WordHuntResultsSummary {...baseProps} foundTarget={true} isFirstFinder={true} />);
    expect(screen.getByTestId('target-first-finder-badge')).toBeInTheDocument();
  });

  it('should show formatted survival time', () => {
    render(
      <WordHuntResultsSummary {...baseProps} survivalTime={95} />
    );
    // 95 seconds = 01:35
    expect(screen.getByText('01:35')).toBeInTheDocument();
  });

  it('should show discovery words count when no player results', () => {
    render(
      <WordHuntResultsSummary {...baseProps} discoveryWords={12} />
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  describe('elimination history', () => {
    it('should show elimination history header when eliminated players exist', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.getByText('wordHunt.results.eliminationHistory')).toBeInTheDocument();
    });

    it('should display eliminated player usernames', () => {
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

    it('should not render elimination history when no players were eliminated', () => {
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

    it('should show word count for eliminated players', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      // Charlie has 10 valid words, Dave has 5
      expect(screen.getByTestId('eliminated-row-Charlie')).toHaveTextContent('10');
      expect(screen.getByTestId('eliminated-row-Dave')).toHaveTextContent('5');
    });
  });

  describe('match summary', () => {
    it('should show match summary header', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.getByText('wordHunt.results.matchSummary')).toBeInTheDocument();
    });

    it('should display all players in match summary', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.getByTestId('match-summary-Alice')).toBeInTheDocument();
      expect(screen.getByTestId('match-summary-Bob')).toBeInTheDocument();
      expect(screen.getByTestId('match-summary-Charlie')).toBeInTheDocument();
      expect(screen.getByTestId('match-summary-Dave')).toBeInTheDocument();
    });

    it('should show word counts for survivors in match summary', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      // Alice: survived with 20 words
      expect(screen.getByTestId('match-summary-Alice')).toHaveTextContent('20');
      // Bob: survived with 15 words
      expect(screen.getByTestId('match-summary-Bob')).toHaveTextContent('15');
    });

    it('should show word counts for eliminated players in match summary', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.getByTestId('match-summary-Charlie')).toHaveTextContent('10');
      expect(screen.getByTestId('match-summary-Dave')).toHaveTextContent('5');
    });

    it('should highlight current user with (YOU) marker', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      const aliceSummary = screen.getByTestId('match-summary-Alice');
      expect(aliceSummary).toHaveTextContent('(results.you)');
    });

    it('should show survived status for survivors', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      const aliceSummary = screen.getByTestId('match-summary-Alice');
      expect(aliceSummary).toHaveTextContent('wordHunt.results.survived');
    });

    it('should show eliminated status for eliminated players', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      const charlieSummary = screen.getByTestId('match-summary-Charlie');
      expect(charlieSummary).toHaveTextContent('results.eliminated');
    });
  });

  describe('no player results', () => {
    it('should not render elimination history or match summary without playerResults', () => {
      render(<WordHuntResultsSummary {...baseProps} />);
      expect(screen.queryByText('wordHunt.results.eliminationHistory')).not.toBeInTheDocument();
      expect(screen.queryByText('wordHunt.results.matchSummary')).not.toBeInTheDocument();
    });

    it('should still show target word hero without player results', () => {
      render(<WordHuntResultsSummary {...baseProps} />);
      expect(screen.getByTestId('target-word-hero')).toBeInTheDocument();
    });
  });

  describe('highlights bar', () => {
    it('should show survival time label', () => {
      render(
        <WordHuntResultsSummary {...baseProps} playerResults={playerResults} currentUsername="Alice" />
      );
      expect(screen.getByText('wordHunt.multiplayer.survivalTime')).toBeInTheDocument();
    });

    it('should show current user word count in highlights', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      // Alice has 20 valid words — shown via ScoreCountUp
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  describe('tip badge', () => {
    it('should show tip badge for current eliminated user', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Charlie"
        />
      );
      expect(screen.getByTestId('word-hunt-tip')).toBeInTheDocument();
    });

    it('should show tip badge for current surviving user', () => {
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
});
