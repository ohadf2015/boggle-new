/**
 * UniqueWordsSection — current player's unique words in multiplayer results.
 *
 * Shows only words the current player found that no other player found,
 * sorted longest-first. Returns null in solo play (< 2 players total).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { WordObject } from '../types';
import UniqueWordsSection from '../UniqueWordsSection';

const makeWord = (word: string, score = word.length * 10): WordObject => ({
  word,
  score,
  validated: true,
  isDuplicate: false,
});

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('UniqueWordsSection', () => {
  it('returns null when fewer than 2 players (solo)', () => {
    const { container } = render(
      <UniqueWordsSection
        allPlayerWords={{ Alice: [makeWord('cat')] }}
        currentUsername="Alice"
        t={t}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when current player has no unique words', () => {
    const { container } = render(
      <UniqueWordsSection
        allPlayerWords={{
          Alice: [makeWord('cat')],
          Bob: [makeWord('cat')],
        }}
        currentUsername="Alice"
        t={t}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders unique words found only by current player', () => {
    render(
      <UniqueWordsSection
        allPlayerWords={{
          Alice: [makeWord('dog'), makeWord('cat')],
          Bob: [makeWord('cat'), makeWord('fish')],
        }}
        currentUsername="Alice"
        t={t}
      />,
    );
    expect(screen.getByText('dog')).toBeInTheDocument();
    expect(screen.queryByText('cat')).not.toBeInTheDocument();
  });

  it('excludes invalid and duplicate words from current player', () => {
    render(
      <UniqueWordsSection
        allPlayerWords={{
          Alice: [
            makeWord('dog'),
            { word: 'bad', score: 0, validated: false, isDuplicate: false },
            { word: 'dupe', score: 0, validated: true, isDuplicate: true },
          ],
          Bob: [makeWord('cat')],
        }}
        currentUsername="Alice"
        t={t}
      />,
    );
    expect(screen.getByText('dog')).toBeInTheDocument();
    expect(screen.queryByText('bad')).not.toBeInTheDocument();
    expect(screen.queryByText('dupe')).not.toBeInTheDocument();
  });

  it('sorts unique words longest-first', () => {
    render(
      <UniqueWordsSection
        allPlayerWords={{
          Alice: [makeWord('apple'), makeWord('go'), makeWord('tree')],
          Bob: [makeWord('fish')],
        }}
        currentUsername="Alice"
        t={t}
      />,
    );
    const items = screen.getAllByRole('listitem');
    const words = items.map((li) => li.textContent?.trim());
    // apple (5) > tree (4) > go (2)
    expect(words.indexOf('apple')).toBeLessThan(words.indexOf('tree'));
    expect(words.indexOf('tree')).toBeLessThan(words.indexOf('go'));
  });

  it('renders a section title from translations', () => {
    render(
      <UniqueWordsSection
        allPlayerWords={{
          Alice: [makeWord('dog')],
          Bob: [makeWord('cat')],
        }}
        currentUsername="Alice"
        t={t}
      />,
    );
    expect(screen.getByText(/results\.uniqueWords\.title/)).toBeInTheDocument();
  });
});
