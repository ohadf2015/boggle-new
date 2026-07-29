/**
 * Wiring test: ResultsDetailsContent mounts UniqueWordsSection
 * in multiplayer results when there are other players.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Player, WordObject } from '../types';

vi.mock('framer-motion', () => ({
  m: {
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
      <button {...props}>{children}</button>
    ),
  },
}));

vi.mock('@/components/results/UniqueWordsSection', () => ({
  __esModule: true,
  default: () => <div data-testid="unique-words-section" />,
}));

import { ResultsDetailsContent } from '../ResultsDetailsContent';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const makeWord = (word: string, score = word.length * 10): WordObject => ({
  word,
  score,
  validated: true,
  isDuplicate: false,
});

const makePlayer = (username: string, score: number): Player => ({
  username,
  score,
  allWords: [],
});

const baseProps = {
  allPlayerWords: {
    Alice: [makeWord('cat'), makeWord('dog')],
    Bob: [makeWord('cat'), makeWord('fish')],
  },
  username: 'Alice',
  gameCode: 'ABCD',
  otherPlayers: [{ ...makePlayer('Bob', 80), allWords: [makeWord('cat'), makeWord('fish')] }],
  missedWords: [],
  isHost: false,
  t,
};

describe('ResultsDetailsContent — unique words wiring', () => {
  it('renders UniqueWordsSection when there are other players', () => {
    render(<ResultsDetailsContent {...baseProps} />);
    expect(screen.getByTestId('unique-words-section')).toBeInTheDocument();
  });

  it('does NOT render UniqueWordsSection in solo play (no other players)', () => {
    render(<ResultsDetailsContent {...baseProps} otherPlayers={[]} />);
    expect(screen.queryByTestId('unique-words-section')).not.toBeInTheDocument();
  });
});
