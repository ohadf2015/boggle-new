import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMemoryHuntGame, pickHintWord, type MemoryWord } from './useMemoryHuntGame';
import type { LetterGrid } from '@/types';

// Sound effects are fire-and-forget; stub them.
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playErrorSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
  }),
}));

const word = (w: string, hasPath = true): MemoryWord => ({
  word: w,
  path: hasPath ? w.split('').map((_, i) => ({ row: 0, col: i })) : [],
  found: false,
});

describe('pickHintWord — clue target selection (root-cause of "clue shows nothing")', () => {
  it('returns null when there are no words', () => {
    expect(pickHintWord([])).toBeNull();
  });

  it('returns null when every word is already found', () => {
    expect(pickHintWord([{ ...word('CAT'), found: true }])).toBeNull();
  });

  it('returns the first unfound word that HAS a non-empty path', () => {
    expect(pickHintWord([word('DOG')])?.word).toBe('DOG');
  });

  it('SKIPS an unfound word whose path is empty and reveals the next real one', () => {
    // This is the bug: an empty path would highlight nothing.
    const words = [word('GHOST', false), word('TIGER', true)];
    expect(pickHintWord(words)?.word).toBe('TIGER');
  });

  it('returns null when the only unfound words have empty paths (graceful no-op)', () => {
    expect(pickHintWord([word('GHOST', false)])).toBeNull();
  });
});

describe('useMemoryHuntGame — clue economy', () => {
  const grid: LetterGrid = [
    ['C', 'A', 'T', 'S', 'X'],
    ['D', 'O', 'G', 'Y', 'Z'],
    ['B', 'I', 'R', 'D', 'Q'],
    ['F', 'I', 'S', 'H', 'W'],
    ['L', 'I', 'O', 'N', 'V'],
  ];
  const availableWords = [
    { word: 'CAT', path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
    { word: 'DOG', path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
  ];

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts a game with ONE free clue (user: "first one for free")', () => {
    const { result } = renderHook(() =>
      useMemoryHuntGame({ grid, availableWords, level: 5, language: 'en', onComplete: vi.fn() }),
    );
    act(() => result.current.startGame());
    expect(result.current.hintsRemaining).toBe(1);
  });

  it('grantClues(n) adds clues (used by the rewarded-ad / unlock flow)', () => {
    const { result } = renderHook(() =>
      useMemoryHuntGame({ grid, availableWords, level: 5, language: 'en', onComplete: vi.fn() }),
    );
    act(() => result.current.startGame());
    act(() => result.current.grantClues(3));
    expect(result.current.hintsRemaining).toBe(4);
  });

  it('never targets a pathless word (study + clue must be able to highlight it)', () => {
    // GHOST has no board path (e.g. a solver-found word) — it must be excluded,
    // otherwise study highlight and clues silently show nothing.
    const withPathless = [
      { word: 'GHOST', path: [] as { row: number; col: number }[] },
      ...availableWords,
    ];
    const { result } = renderHook(() =>
      useMemoryHuntGame({ grid, availableWords: withPathless, level: 2, language: 'en', onComplete: vi.fn() }),
    );
    act(() => result.current.startGame());
    expect(result.current.targetWords.length).toBeGreaterThan(0);
    for (const tw of result.current.targetWords) {
      expect(tw.path.length, `${tw.word} must have a path`).toBeGreaterThan(0);
    }
  });
});
