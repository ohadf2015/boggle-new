/**
 * PracticeWordHuntSandbox is now a thin wrapper around PracticeSwipeBoard —
 * it just picks the wordHunt mode + board size + goal. The shared sandbox
 * covers the real swipe interaction + dictionary validation; here we only
 * assert that the wrapper renders the correct mode surface and key chrome.
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

  it('shows progress dots for each word toward the goal', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByTestId('practice-progress')).toBeInTheDocument();
  });

  it('does NOT render any survival HUD chrome (life bar, attempts, clues)', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.queryByTestId('survival-life-bar')).toBeNull();
    expect(screen.queryByTestId('clue-shop')).toBeNull();
    expect(screen.queryByTestId('attempts-row')).toBeNull();
  });
});
