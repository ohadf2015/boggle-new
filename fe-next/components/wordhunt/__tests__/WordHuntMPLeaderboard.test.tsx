/**
 * Tests for WordHuntMPLeaderboard
 * Compact player lives/scores overlay for MP WordHunt
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { WordHuntMPLeaderboard } from '../WordHuntMPLeaderboard';

describe('WordHuntMPLeaderboard', () => {
  const defaultProps = {
    playerLives: { alice: 80, bob: 50, charlie: 0 } as Record<string, number>,
    eliminatedPlayers: ['charlie'],
    leaderboard: [
      { username: 'alice', score: 300, wordCount: 10 },
      { username: 'bob', score: 200, wordCount: 8 },
      { username: 'charlie', score: 100, wordCount: 5 },
    ],
    currentUsername: 'alice',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'wordHunt.mp.players': 'Players',
        'wordHunt.mp.eliminated': 'Eliminated',
      };
      return translations[key] || key;
    },
  };

  it('should render all players', () => {
    render(<WordHuntMPLeaderboard {...defaultProps} />);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('charlie')).toBeInTheDocument();
  });

  it('should show scores for each player', () => {
    render(<WordHuntMPLeaderboard {...defaultProps} />);
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should mark eliminated players', () => {
    render(<WordHuntMPLeaderboard {...defaultProps} />);
    const charlieRow = screen.getByText('charlie').closest('[data-player]');
    expect(charlieRow).toHaveAttribute('data-eliminated', 'true');
  });

  it('should highlight current user', () => {
    render(<WordHuntMPLeaderboard {...defaultProps} />);
    const aliceRow = screen.getByText('alice').closest('[data-player]');
    expect(aliceRow).toHaveAttribute('data-current', 'true');
  });

  it('should show life bar for each player', () => {
    render(<WordHuntMPLeaderboard {...defaultProps} />);
    const lifeBars = screen.getAllByRole('progressbar');
    expect(lifeBars.length).toBeGreaterThanOrEqual(3);
  });

  it('should render with empty leaderboard', () => {
    render(
      <WordHuntMPLeaderboard
        {...defaultProps}
        leaderboard={[]}
        playerLives={{}}
        eliminatedPlayers={[]}
      />
    );
    // Should not crash
    expect(screen.queryByText('alice')).not.toBeInTheDocument();
  });
});
