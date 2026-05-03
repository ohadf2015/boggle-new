/**
 * PracticeClassicSandbox is now a thin wrapper around PracticeSwipeBoard —
 * it just picks the mode + board size + goal. The shared sandbox covers the
 * real swipe interaction + dictionary validation; here we only assert that
 * the wrapper renders the correct mode surface and key chrome.
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

import PracticeClassicSandbox from '../PracticeClassicSandbox';

describe('PracticeClassicSandbox', () => {
  it('renders the swipe board surface tagged with the classic mode', () => {
    render(<PracticeClassicSandbox />);
    const board = screen.getByTestId('practice-swipe-board');
    expect(board).toBeInTheDocument();
    expect(board).toHaveAttribute('data-mode', 'classic');
  });

  it('mounts the real GridComponent so the player gets swipe-over-letters', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.getByTestId('grid-component')).toBeInTheDocument();
  });

  it('renders a single short instruction so the player knows what to do', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.getByTestId('practice-instruction')).toBeInTheDocument();
  });

  it('shows progress dots for each word toward the goal', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.getByTestId('practice-progress')).toBeInTheDocument();
  });

  it('does NOT render any competitive HUD chrome (score, combo, timer)', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByTestId('combo-display')).toBeNull();
    expect(screen.queryByTestId('score-display')).toBeNull();
    expect(screen.queryByTestId('timer-bar')).toBeNull();
  });
});
