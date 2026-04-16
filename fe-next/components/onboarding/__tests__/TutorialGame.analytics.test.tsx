/**
 * TutorialGame analytics — fires onboarding_first_word_found on first valid
 * word per mount. Subsequent words within the same attempt do NOT re-fire.
 * `attemptNumber` flows from parent (default 1) so PostHog can see retry
 * friction (attempt>1 pairs with score_reveal:retry upstream).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackOnboardingFirstWord: vi.fn(),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const Wrap = React.forwardRef(function Wrap({ children, ...p }: any, ref: any) {
    return <div ref={ref} {...p}>{children}</div>;
  });
  return {
    motion: new Proxy({} as any, { get: () => Wrap }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('lucide-react', () => ({
  Sparkles: () => null,
  Trophy: () => null,
  Target: () => null,
}));

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: () => null,
}));

vi.mock('../MiniGrid', () => ({
  __esModule: true,
  default: (props: any) => (
    <div
      data-testid="mini-grid"
      onClick={() => props.onDemoComplete?.()}
    />
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, f?: any) => (typeof f === 'string' ? f : k), language: 'en', dir: 'ltr' }),
}));

vi.mock('../tutorialBoardConfig', () => ({
  getTutorialBoard: () => ({
    letters: [['C','A','T','S'],['R','O','P','E'],['S','T','A','R'],['D','O','G','S']],
    targetWords: [
      { word: 'CAT', path: [], length: 3 },
      { word: 'DOG', path: [], length: 3 },
      { word: 'STARS', path: [], length: 5 },
    ],
    validWords: new Set(['CAT', 'DOG', 'STARS']),
  }),
  isValidTutorialWord: (w: string) =>
    new Set(['CAT', 'DOG', 'STARS']).has(w.toUpperCase()),
}));

import TutorialGame from '../TutorialGame';
import { trackOnboardingFirstWord } from '@/utils/growthTracking';

describe('TutorialGame analytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fires first-word event with attemptNumber=1 on first valid word', () => {
    render(<TutorialGame onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mini-grid'));
    expect(trackOnboardingFirstWord).toHaveBeenCalledTimes(1);
    expect(trackOnboardingFirstWord).toHaveBeenCalledWith('CAT', 1);
  });

  it('does NOT re-fire for second word within the same attempt', () => {
    render(<TutorialGame onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mini-grid')); // CAT
    fireEvent.click(screen.getByTestId('mini-grid')); // DOG
    expect(trackOnboardingFirstWord).toHaveBeenCalledTimes(1);
  });

  it('carries attemptNumber prop through to event', () => {
    render(<TutorialGame onComplete={vi.fn()} attemptNumber={3} />);
    fireEvent.click(screen.getByTestId('mini-grid'));
    expect(trackOnboardingFirstWord).toHaveBeenCalledWith('CAT', 3);
  });
});
