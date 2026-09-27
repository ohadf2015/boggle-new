/**
 * MissedWords — high-value board words the current player missed.
 *
 * Declutter contract: show the top 3 highest-scoring misses by default, with a
 * tap-to-reveal toggle for the rest. Keeps the results card scannable.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MissedWords, { type MissedWord } from '../MissedWords';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

const makeMissed = (word: string, score: number): MissedWord => ({
  word,
  score,
  foundBy: ['someone'],
});

// Six high-value (3+) misses, descending by score.
const sixMisses: MissedWord[] = [
  makeMissed('strongest', 8),
  makeMissed('beautiful', 7),
  makeMissed('elephant', 6),
  makeMissed('rabbit', 5),
  makeMissed('panda', 4),
  makeMissed('crow', 3),
];

describe('MissedWords declutter', () => {
  it('shows only the top 3 missed words by default', () => {
    render(<MissedWords missedWords={sixMisses} />);
    expect(screen.getByText('strongest')).toBeInTheDocument();
    expect(screen.getByText('beautiful')).toBeInTheDocument();
    expect(screen.getByText('elephant')).toBeInTheDocument();
    expect(screen.queryByText('rabbit')).not.toBeInTheDocument();
    expect(screen.queryByText('panda')).not.toBeInTheDocument();
  });

  it('reveals all missed words after tapping show more', () => {
    render(<MissedWords missedWords={sixMisses} />);
    // Toggle label is "common.showMore (N)" — match by prefix.
    fireEvent.click(screen.getByText(/common\.showMore/));
    expect(screen.getByText('rabbit')).toBeInTheDocument();
    expect(screen.getByText('panda')).toBeInTheDocument();
    expect(screen.getByText('crow')).toBeInTheDocument();
  });

  it('does not render a toggle when 3 or fewer misses', () => {
    render(<MissedWords missedWords={sixMisses.slice(0, 3)} />);
    expect(screen.queryByText(/common\.showMore/)).not.toBeInTheDocument();
  });

  describe('reduced motion', () => {
    beforeEach(() => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('still shows top-3 and reveals all with motion suppressed', () => {
      render(<MissedWords missedWords={sixMisses} />);
      expect(screen.getByText('strongest')).toBeInTheDocument();
      expect(screen.queryByText('rabbit')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText(/common\.showMore/));
      expect(screen.getByText('rabbit')).toBeInTheDocument();
      expect(screen.getByText('crow')).toBeInTheDocument();
    });
  });
});
