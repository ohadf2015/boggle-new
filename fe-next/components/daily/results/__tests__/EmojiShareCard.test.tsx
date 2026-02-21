import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmojiShareCard } from '../EmojiShareCard';

const mockWords = [
  { word: 'CATCH', found: true },
  { word: 'LIGHT', found: true },
  { word: 'AT', found: true },
  { word: 'STONE', found: false },
];

describe('EmojiShareCard', () => {
  it('renders puzzle number and score', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={847}
        solved={true}
        words={mockWords}
        language="en"
      />
    );
    expect(screen.getByText(/421/)).toBeInTheDocument();
    expect(screen.getByText(/847/)).toBeInTheDocument();
  });

  it('renders green squares for found words', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={847}
        solved={true}
        words={mockWords}
        language="en"
      />
    );
    // CATCH = 5 letters = 5 green squares
    const card = screen.getByTestId('emoji-share-card');
    expect(card).toHaveTextContent('🟩🟩🟩🟩🟩');
  });

  it('renders black squares for unfound words (hides word)', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={847}
        solved={true}
        words={mockWords}
        language="en"
      />
    );
    // STONE = 5 letters = 5 black squares
    const card = screen.getByTestId('emoji-share-card');
    expect(card).toHaveTextContent('⬛⬛⬛⬛⬛');
  });

  it('shows domain lexiclash.live', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={847}
        solved={true}
        words={mockWords}
        language="en"
      />
    );
    expect(screen.getByText(/lexiclash\.live/)).toBeInTheDocument();
  });
});
