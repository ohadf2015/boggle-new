/**
 * WordComparisonGrid — multiplayer word comparison drill-down
 *
 * Shows per-player columns of found words, marking unique (only that player)
 * and shared (all players) entries so users can see what they saw that others
 * missed and vice versa.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { WordObject } from '../types';
import WordComparisonGrid from '../WordComparisonGrid';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const makeWord = (word: string, score = word.length * 10): WordObject => ({
  word,
  score,
  validated: true,
  isDuplicate: false,
});

const t = (key: string, params?: Record<string, string | number>) => {
  if (params) return `${key}:${JSON.stringify(params)}`;
  return key;
};

describe('WordComparisonGrid', () => {
  it('renders null when fewer than 2 players', () => {
    const { container } = render(
      <WordComparisonGrid
        allPlayerWords={{ Alice: [makeWord('cat')] }}
        currentUsername="Alice"
        t={t}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a column per player with their word lists', () => {
    render(
      <WordComparisonGrid
        allPlayerWords={{
          Alice: [makeWord('cat'), makeWord('dog')],
          Bob: [makeWord('fish'), makeWord('cat')],
        }}
        currentUsername="Alice"
        t={t}
      />,
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // Both players' words appear somewhere
    expect(screen.getAllByText('cat').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('dog')).toBeInTheDocument();
    expect(screen.getByText('fish')).toBeInTheDocument();
  });

  it('marks unique words (found by only one player) with a data-unique flag', () => {
    render(
      <WordComparisonGrid
        allPlayerWords={{
          Alice: [makeWord('cat'), makeWord('dog')],
          Bob: [makeWord('cat'), makeWord('fish')],
        }}
        currentUsername="Alice"
        t={t}
      />,
    );
    const dog = screen.getByText('dog').closest('[data-word]');
    const fish = screen.getByText('fish').closest('[data-word]');
    const cats = screen.getAllByText('cat').map(el => el.closest('[data-word]'));
    expect(dog).toHaveAttribute('data-unique', 'true');
    expect(fish).toHaveAttribute('data-unique', 'true');
    // Shared 'cat' should NOT be marked unique
    cats.forEach(c => expect(c).toHaveAttribute('data-unique', 'false'));
  });

  it('marks shared words (found by multiple players) as non-unique', () => {
    render(
      <WordComparisonGrid
        allPlayerWords={{
          Alice: [makeWord('cat'), makeWord('dog')],
          Bob: [makeWord('cat'), makeWord('fish')],
          Carol: [makeWord('cat'), makeWord('bird')],
        }}
        currentUsername="Alice"
        t={t}
        />,
    );
    const cats = screen.getAllByText('cat').map(el => el.closest('[data-word]'));
    expect(cats.length).toBe(3);
    cats.forEach(c => expect(c).toHaveAttribute('data-unique', 'false'));
  });

  it('highlights the current player column with data-current="true"', () => {
    render(
      <WordComparisonGrid
        allPlayerWords={{
          Alice: [makeWord('cat')],
          Bob: [makeWord('dog')],
        }}
        currentUsername="Alice"
        t={t}
      />,
    );
    const aliceColumn = screen.getByTestId('word-comparison-column-Alice');
    const bobColumn = screen.getByTestId('word-comparison-column-Bob');
    expect(aliceColumn).toHaveAttribute('data-current', 'true');
    expect(bobColumn).toHaveAttribute('data-current', 'false');
  });

  it('only counts validated non-duplicate words', () => {
    render(
      <WordComparisonGrid
        allPlayerWords={{
          Alice: [
            makeWord('cat'),
            { word: 'invalid', score: 0, validated: false, isDuplicate: false },
            { word: 'dupe', score: 0, validated: true, isDuplicate: true },
          ],
          Bob: [makeWord('dog')],
        }}
        currentUsername="Alice"
        t={t}
      />,
    );
    const aliceCol = screen.getByTestId('word-comparison-column-Alice');
    expect(within(aliceCol).getByText('cat')).toBeInTheDocument();
    expect(within(aliceCol).queryByText('invalid')).not.toBeInTheDocument();
    expect(within(aliceCol).queryByText('dupe')).not.toBeInTheDocument();
  });

  it('renders a section title from translations', () => {
    render(
      <WordComparisonGrid
        allPlayerWords={{
          Alice: [makeWord('cat')],
          Bob: [makeWord('dog')],
        }}
        currentUsername="Alice"
        t={t}
      />,
    );
    expect(screen.getByText(/results\.wordComparison\.title/)).toBeInTheDocument();
  });
});
