/**
 * PracticeWordHuntSandbox renders a real-game-style hidden-target hunt:
 * clue boxes, tries counter, Wordle-style feedback. We assert the surface
 * markers and that the survival HUD chrome doesn't leak in.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
  useLanguageSafe: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));

vi.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: () => <div data-testid="grid-component" />,
}));

vi.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: () => <div data-testid="word-forming-area" />,
}));

vi.mock('@/hooks/useWordSubmission', () => ({
  useWordSubmission: () => ({
    foundWords: [],
    currentFeedback: null,
    submitWord: vi.fn(),
    reset: vi.fn(),
    validWordCount: 0,
  }),
}));

// The hunt enumerates valid words on the board via checkWord — pretend a small
// set of common letters always validates so we get a target picked deterministically.
vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({
    checkWord: (w: string) => w.length >= 3 && w.length <= 5,
    isLoaded: true,
  }),
}));

import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';

describe('PracticeWordHuntSandbox', () => {
  it('renders the swipe board surface tagged with the wordHunt mode', () => {
    render(<PracticeWordHuntSandbox />);
    const board = screen.getByTestId('practice-swipe-board');
    expect(board).toBeInTheDocument();
    expect(board).toHaveAttribute('data-mode', 'wordHunt');
  });

  it('mounts the real GridComponent so the player gets swipe-over-letters', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByTestId('grid-component')).toBeInTheDocument();
  });

  it('renders a single short instruction so the player knows what to do', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByTestId('practice-instruction')).toBeInTheDocument();
  });

  it('shows tries-remaining HUD reused from the real word hunt clue area', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByTestId('practice-tries-left')).toBeInTheDocument();
  });

  it('renders the clue boxes that mirror the real game target display', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByTestId('practice-clue-boxes')).toBeInTheDocument();
  });

  it('does NOT render any survival HUD chrome (life bar, attempts, clues)', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.queryByTestId('survival-life-bar')).toBeNull();
    expect(screen.queryByTestId('clue-shop')).toBeNull();
    expect(screen.queryByTestId('attempts-row')).toBeNull();
  });
});
