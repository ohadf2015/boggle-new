/**
 * On completion the celebration card should REPLACE the play surface (grid,
 * word-forming area, found-words list), not stack underneath it.
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

vi.mock('@/utils/confettiUtils', () => ({
  fireOnboardingBurst: vi.fn(),
  fireVictoryConfetti: vi.fn(),
}));

vi.mock('@/lib/practice/practiceProgress', () => ({
  markPracticeMode: vi.fn(),
}));

const goal = 3;
const validWords = [
  { word: 'cat', isValid: true },
  { word: 'dog', isValid: true },
  { word: 'sun', isValid: true },
];

vi.mock('@/hooks/useWordSubmission', () => ({
  useWordSubmission: () => ({
    foundWords: validWords,
    currentFeedback: null,
    submitWord: vi.fn(),
    reset: vi.fn(),
    validWordCount: goal,
  }),
}));

import PracticeSwipeBoard from '../PracticeSwipeBoard';

describe('PracticeSwipeBoard — completion replaces the play surface', () => {
  it('renders the celebration card', () => {
    render(<PracticeSwipeBoard mode="classic" rows={4} cols={4} goal={goal} />);
    expect(screen.getByTestId('practice-complete-card')).toBeInTheDocument();
  });

  it('does NOT render the grid once complete', () => {
    render(<PracticeSwipeBoard mode="classic" rows={4} cols={4} goal={goal} />);
    expect(screen.queryByTestId('grid-component')).toBeNull();
  });

  it('does NOT render the word-forming area once complete', () => {
    render(<PracticeSwipeBoard mode="classic" rows={4} cols={4} goal={goal} />);
    expect(screen.queryByTestId('word-forming-area')).toBeNull();
  });

  it('does NOT render the found-words list once complete (stats live in the card)', () => {
    render(<PracticeSwipeBoard mode="classic" rows={4} cols={4} goal={goal} />);
    expect(screen.queryByTestId('practice-found-words')).toBeNull();
  });
});
