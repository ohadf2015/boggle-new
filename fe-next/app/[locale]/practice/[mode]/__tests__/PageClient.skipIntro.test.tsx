/**
 * Practice flow rule: drop the player straight into the sandbox. The earlier
 * intro card + tutorial sheet were noise — the sandbox itself shows a single
 * instruction line, so there's no preflight chrome to wait through.
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

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => false, isLoaded: true }),
}));

import PracticePageClient from '../PageClient';

describe('PracticePageClient', () => {
  it('classic: drops the player straight into the swipe sandbox', () => {
    render(<PracticePageClient mode="classic" locale="en" />);
    const board = screen.getByTestId('practice-swipe-board');
    expect(board).toHaveAttribute('data-mode', 'classic');
  });

  it('wordHunt: drops the player straight into the swipe sandbox', () => {
    render(<PracticePageClient mode="wordHunt" locale="en" />);
    const board = screen.getByTestId('practice-swipe-board');
    expect(board).toHaveAttribute('data-mode', 'wordHunt');
  });

  it('wheelRush: shows the wheel sandbox (its own surface)', () => {
    render(<PracticePageClient mode="wheelRush" locale="en" />);
    expect(screen.getByTestId('practice-wheel-center')).toBeInTheDocument();
  });
});
