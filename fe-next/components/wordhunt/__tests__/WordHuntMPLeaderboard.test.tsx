/**
 * Tests for WordHuntMPLeaderboard
 * Compact player lives/scores overlay for MP WordHunt
 * Note: Component renders both mobile + desktop views; JSDOM shows both.
 * Tests query the first match (mobile view).
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
    // Each player appears in both mobile and desktop views
    expect(screen.getAllByText('alice').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('bob').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('charlie').length).toBeGreaterThanOrEqual(1);
  });

  it('should show scores for each player', () => {
    render(<WordHuntMPLeaderboard {...defaultProps} />);
    expect(screen.getAllByText('300').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('200').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('100').length).toBeGreaterThanOrEqual(1);
  });

  it('should mark eliminated players', () => {
    render(<WordHuntMPLeaderboard {...defaultProps} />);
    const charlieRows = screen.getAllByText('charlie').map(el => el.closest('[data-player]'));
    expect(charlieRows.some(row => row?.getAttribute('data-eliminated') === 'true')).toBe(true);
  });

  it('should highlight current user', () => {
    render(<WordHuntMPLeaderboard {...defaultProps} />);
    const aliceRows = screen.getAllByText('alice').map(el => el.closest('[data-player]'));
    expect(aliceRows.some(row => row?.getAttribute('data-current') === 'true')).toBe(true);
  });

  it('should show life bar for each player', () => {
    render(<WordHuntMPLeaderboard {...defaultProps} />);
    const lifeBars = screen.getAllByRole('progressbar');
    // 3 players × 2 views = 6, but at least 3
    expect(lifeBars.length).toBeGreaterThanOrEqual(3);
  });

  it('should show wrong-guess indicator for players who just lost life', () => {
    const { rerender } = render(<WordHuntMPLeaderboard {...defaultProps} />);

    rerender(
      <WordHuntMPLeaderboard
        {...defaultProps}
        playerLives={{ alice: 80, bob: 30, charlie: 0 }}
        wrongGuessPlayers={['bob']}
      />
    );

    const bobRows = screen.getAllByText('bob').map(el => el.closest('[data-player]'));
    expect(bobRows.some(row => row?.querySelector('[data-wrong-guess]'))).toBe(true);
  });

  it('should not show wrong-guess indicator for players not in wrongGuessPlayers', () => {
    render(
      <WordHuntMPLeaderboard
        {...defaultProps}
        wrongGuessPlayers={['bob']}
      />
    );

    const aliceRows = screen.getAllByText('alice').map(el => el.closest('[data-player]'));
    expect(aliceRows.every(row => !row?.querySelector('[data-wrong-guess]'))).toBe(true);
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
    expect(screen.queryByText('alice')).not.toBeInTheDocument();
  });
});
