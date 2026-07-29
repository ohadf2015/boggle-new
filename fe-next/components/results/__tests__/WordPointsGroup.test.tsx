/**
 * WordPointsGroup — full valid-word list grouped by point value.
 *
 * Rendered behind the "Show Details" toggle on results (MP + solo). With no
 * cap a prolific game dumps every word at once → "too many words" wall. These
 * tests pin the declutter behaviour: show the top N highest-value words, then
 * a reveal toggle for the rest. Highest-point words survive the trim.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { WordObject } from '../types';
import { WordPointsGroup } from '../WordPointsGroup';

const makeWord = (word: string, score: number): WordObject => ({
  word,
  score,
  validated: true,
  isDuplicate: false,
});

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

/** Build a {wordsByPoints, sortedPointGroups} pair from a flat word list. */
const group = (words: WordObject[]) => {
  const wordsByPoints: Record<number, WordObject[]> = {};
  for (const w of words) {
    (wordsByPoints[w.score] ??= []).push(w);
  }
  const sortedPointGroups = Object.keys(wordsByPoints)
    .map(Number)
    .sort((a, b) => b - a);
  return { wordsByPoints, sortedPointGroups };
};

describe('WordPointsGroup', () => {
  it('renders nothing when there are no point groups', () => {
    const { container } = render(
      <WordPointsGroup wordsByPoints={{}} sortedPointGroups={[]} t={t} mode="simple" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders every word when total is at or below the cap', () => {
    const words = [makeWord('cat', 1), makeWord('dog', 1), makeWord('fish', 3)];
    const { wordsByPoints, sortedPointGroups } = group(words);
    render(
      <WordPointsGroup
        wordsByPoints={wordsByPoints}
        sortedPointGroups={sortedPointGroups}
        t={t}
        mode="simple"
        maxVisibleWords={5}
      />,
    );
    expect(screen.getByText('cat')).toBeInTheDocument();
    expect(screen.getByText('dog')).toBeInTheDocument();
    expect(screen.getByText('fish')).toBeInTheDocument();
    // No reveal toggle when nothing is hidden.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  describe('declutter: cap + reveal', () => {
    // 6 words, cap of 2 → only the 2 highest-value shown initially.
    const words = [
      makeWord('quartz', 11), // highest
      makeWord('jumpy', 9),
      makeWord('table', 2),
      makeWord('chair', 2),
      makeWord('cat', 1),
      makeWord('dog', 1), // lowest tail — first to be cut
    ];
    const { wordsByPoints, sortedPointGroups } = group(words);

    const renderCapped = () =>
      render(
        <WordPointsGroup
          wordsByPoints={wordsByPoints}
          sortedPointGroups={sortedPointGroups}
          t={t}
          mode="simple"
          maxVisibleWords={2}
        />,
      );

    it('caps the initial render to the top N highest-value words', () => {
      renderCapped();
      expect(screen.getByText('quartz')).toBeInTheDocument();
      expect(screen.getByText('jumpy')).toBeInTheDocument();
      // Everything below the cap is hidden until revealed.
      expect(screen.queryByText('dog')).not.toBeInTheDocument();
      expect(screen.queryByText('cat')).not.toBeInTheDocument();
      expect(screen.queryByText('table')).not.toBeInTheDocument();
    });

    it('shows a reveal toggle when words are hidden', () => {
      renderCapped();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('reveals every word after tapping the toggle', () => {
      renderCapped();
      fireEvent.click(screen.getByRole('button'));
      for (const w of ['quartz', 'jumpy', 'table', 'chair', 'cat', 'dog']) {
        expect(screen.getByText(w)).toBeInTheDocument();
      }
    });

    it('keeps the highest-value words and cuts the low-point tail', () => {
      renderCapped();
      // 11 and 9 survive; 1-pointers are cut.
      expect(screen.getByText('quartz')).toBeInTheDocument();
      expect(screen.queryByText('dog')).not.toBeInTheDocument();
    });

    it('per-tier count badge shows the true tier total while collapsed', () => {
      // Tier "1" has 5 words but only 1 is visible under the cap — the badge
      // must report the real total (5), not the visible subset.
      const tierWords = [
        makeWord('quartz', 11),
        makeWord('cat', 1),
        makeWord('dog', 1),
        makeWord('cow', 1),
        makeWord('pig', 1),
        makeWord('hen', 1),
      ];
      const g = group(tierWords);
      render(
        <WordPointsGroup
          wordsByPoints={g.wordsByPoints}
          sortedPointGroups={g.sortedPointGroups}
          t={t}
          mode="simple"
          maxVisibleWords={2}
        />,
      );
      expect(screen.getByText(/5\s+hostView\.words/)).toBeInTheDocument();
    });
  });

  it('caps in chip mode too (multiplayer surface)', () => {
    const words = [
      makeWord('quartz', 11),
      makeWord('jumpy', 9),
      makeWord('cat', 1),
      makeWord('dog', 1),
    ];
    const { wordsByPoints, sortedPointGroups } = group(words);
    render(
      <WordPointsGroup
        wordsByPoints={wordsByPoints}
        sortedPointGroups={sortedPointGroups}
        t={t}
        mode="chip"
        maxVisibleWords={2}
      />,
    );
    expect(screen.getByText('quartz')).toBeInTheDocument();
    expect(screen.queryByText('dog')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
