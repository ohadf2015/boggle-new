/**
 * WordHuntResultsSummary Tests
 * Tests the word hunt mode results summary component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import WordHuntResultsSummary from '../WordHuntResultsSummary';

// Mock translations
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const baseProps = {
  targetWord: 'PUZZLE',
  foundTarget: true,
  isFirstFinder: false,
  survivalTime: 120,
  discoveryWords: 8,
};

const playerResults = [
  { username: 'Alice', score: 150, survived: true, lifeRemaining: 80 },
  { username: 'Bob', score: 120, survived: true, lifeRemaining: 45 },
  { username: 'Charlie', score: 90, survived: false, lifeRemaining: 0 },
  { username: 'Dave', score: 60, survived: false, lifeRemaining: 0 },
];

describe('WordHuntResultsSummary', () => {
  it('should reveal the target word', () => {
    render(<WordHuntResultsSummary {...baseProps} />);
    expect(screen.getByText('PUZZLE')).toBeInTheDocument();
  });

  it('should show first finder badge when applicable', () => {
    render(
      <WordHuntResultsSummary {...baseProps} isFirstFinder={true} />
    );
    expect(screen.getByText('wordHunt.multiplayer.firstFinder')).toBeInTheDocument();
  });

  it('should not show first finder badge when not first', () => {
    render(<WordHuntResultsSummary {...baseProps} />);
    expect(screen.queryByText('wordHunt.multiplayer.firstFinder')).not.toBeInTheDocument();
  });

  it('should show formatted survival time', () => {
    render(
      <WordHuntResultsSummary {...baseProps} survivalTime={95} />
    );
    // 95 seconds = 1:35
    expect(screen.getByText('1:35')).toBeInTheDocument();
  });

  it('should show discovery words count', () => {
    render(
      <WordHuntResultsSummary {...baseProps} discoveryWords={12} />
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should show not found indicator when target not found', () => {
    render(
      <WordHuntResultsSummary {...baseProps} foundTarget={false} />
    );
    expect(screen.getByText('wordHunt.multiplayer.notFound')).toBeInTheDocument();
  });

  describe('survivors and eliminated sections', () => {
    it('should show survivors section header when playerResults provided', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.getByText('wordHunt.results.survivors')).toBeInTheDocument();
    });

    it('should show eliminated section header when there are eliminated players', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.getByText('wordHunt.results.eliminated')).toBeInTheDocument();
    });

    it('should display all survivor usernames', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should display all eliminated usernames', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.getByText('Dave')).toBeInTheDocument();
    });

    it('should show scores for each player', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('90')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
    });

    it('should highlight the current player row', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      const currentPlayerRow = screen.getByTestId('player-row-Alice');
      expect(currentPlayerRow.className).toContain('neo-yellow');
    });

    it('should not highlight other player rows', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      const otherPlayerRow = screen.getByTestId('player-row-Bob');
      expect(otherPlayerRow.className).not.toContain('neo-yellow');
    });

    it('should sort survivors by score descending', () => {
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={playerResults}
          currentUsername="Alice"
        />
      );
      const survivorRows = screen.getAllByTestId(/^player-row-/);
      // First two should be survivors sorted by score: Alice (150), Bob (120)
      expect(survivorRows[0]).toHaveAttribute('data-testid', 'player-row-Alice');
      expect(survivorRows[1]).toHaveAttribute('data-testid', 'player-row-Bob');
    });

    it('should not render survivor/eliminated sections when playerResults is undefined', () => {
      render(<WordHuntResultsSummary {...baseProps} />);
      expect(screen.queryByText('wordHunt.results.survivors')).not.toBeInTheDocument();
      expect(screen.queryByText('wordHunt.results.eliminated')).not.toBeInTheDocument();
    });

    it('should not render eliminated section when no players were eliminated', () => {
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
      expect(screen.getByText('wordHunt.results.survivors')).toBeInTheDocument();
      expect(screen.queryByText('wordHunt.results.eliminated')).not.toBeInTheDocument();
    });

    it('should show life remaining for survivors', () => {
      const singleSurvivor = [
        { username: 'Alice', score: 150, survived: true, lifeRemaining: 80 },
      ];
      render(
        <WordHuntResultsSummary
          {...baseProps}
          playerResults={singleSurvivor}
          currentUsername="Alice"
        />
      );
      // Life bar should be rendered with aria attributes
      const lifeBar = screen.getByRole('progressbar');
      expect(lifeBar).toHaveAttribute('aria-valuenow', '80');
    });
  });
});
