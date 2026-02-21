import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmojiShareCard } from '../EmojiShareCard';

// Returns a value with '{number}' for daily.puzzleNumber so replace() works in tests.
const t = (key: string) => {
  if (key === 'daily.puzzleNumber') return 'Word Hunt #{number}';
  return key;
};

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
        t={t}
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
        t={t}
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
        t={t}
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
        t={t}
      />
    );
    expect(screen.getByText(/lexiclash\.live/)).toBeInTheDocument();
  });

  it('renders ❌ when not solved', () => {
    render(
      <EmojiShareCard
        puzzleNumber={421}
        score={0}
        solved={false}
        words={[{ word: 'CATCH', found: false }]}
        language="en"
        t={t}
      />
    );
    const card = screen.getByTestId('emoji-share-card');
    expect(card).toHaveTextContent('❌');
  });
});
