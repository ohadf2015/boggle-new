import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameWordList, COMPACT_MAX_VISIBLE } from './GameWordList';
import type { FoundWord } from '@/shared/types/view';

const t = ((k: string) => k) as never;

// 30 words named word0..word29; word29 is the newest (last in the array).
const manyWords: FoundWord[] = Array.from({ length: 30 }, (_, i) => ({
  word: `word${i}`,
  isValid: true,
  timestamp: i,
}));

describe('GameWordList compact view windowing', () => {
  it('renders only the newest COMPACT_MAX_VISIBLE words, not all of them', () => {
    render(<GameWordList foundWords={manyWords} minWordLength={3} t={t} compact />);

    // Newest word is always shown.
    expect(screen.getByText('word29')).toBeInTheDocument();
    // The window boundary (12th-newest) is shown.
    expect(screen.getByText(`word${30 - COMPACT_MAX_VISIBLE}`)).toBeInTheDocument();
    // Anything older than the window is NOT mounted (the perf win).
    expect(screen.queryByText(`word${30 - COMPACT_MAX_VISIBLE - 1}`)).not.toBeInTheDocument();
    expect(screen.queryByText('word0')).not.toBeInTheDocument();
  });

  it('shows the TRUE total count in the badge, not the windowed count', () => {
    render(<GameWordList foundWords={manyWords} minWordLength={3} t={t} compact />);
    // Count badge reflects all 30 found words even though only 12 chips render.
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders every word when the count is within the window', () => {
    const few = manyWords.slice(0, 5);
    render(<GameWordList foundWords={few} minWordLength={3} t={t} compact />);
    expect(screen.getByText('word0')).toBeInTheDocument();
    expect(screen.getByText('word4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
