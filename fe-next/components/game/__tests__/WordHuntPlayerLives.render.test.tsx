/**
 * Test: WordHuntPlayerLives is rendered in PortraitLayout for word-hunt games
 *
 * TDD RED phase — verifies the component appears in the layout
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';
import { WordHuntPlayerLives } from '../WordHuntPlayerLives';

describe('WordHuntPlayerLives rendering in PortraitLayout', () => {
  const portraitSource = fs.readFileSync(
    path.resolve(__dirname, '../in-game/components/PortraitLayout.tsx'),
    'utf-8',
  );

  it('should import WordHuntPlayerLives component', () => {
    expect(portraitSource).toContain('WordHuntPlayerLives');
  });

  it('should accept wordHuntPlayerLives prop', () => {
    expect(portraitSource).toContain('wordHuntPlayerLives');
  });

  it('should accept wordHuntEliminatedPlayers prop', () => {
    expect(portraitSource).toContain('wordHuntEliminatedPlayers');
  });
});

describe('WordHuntPlayerLives component', () => {
  // Also verify the component itself renders correctly
  it('should render player life bars for other players', () => {
    // Import the component
    

    render(
      <WordHuntPlayerLives
        playerLives={{ alice: 80, bob: 50, charlie: 10 }}
        eliminatedPlayers={[]}
        currentPlayer="alice"
      />,
    );

    expect(screen.getByTestId('word-hunt-player-lives')).toBeInTheDocument();
    // Should show bob and charlie but not alice (current player)
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('charlie')).toBeInTheDocument();
    expect(screen.queryByText('alice')).not.toBeInTheDocument();
  });

  it('should show eliminated players with strikethrough', () => {
    

    render(
      <WordHuntPlayerLives
        playerLives={{ alice: 80, bob: 0 }}
        eliminatedPlayers={['bob']}
        currentPlayer="alice"
      />,
    );

    const bobElement = screen.getByText('bob');
    expect(bobElement).toHaveClass('line-through');
  });
});
