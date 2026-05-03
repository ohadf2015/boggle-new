/**
 * Fluency rule: a player who has already completed a mode should NOT have to
 * sit through the intro card again on re-entry. Tested by pre-marking the mode
 * complete and asserting we land directly on the bespoke sandbox surface.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

const searchParamsValue = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsValue,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/hooks/useModeFirstSeen', () => ({
  useModeFirstSeen: () => ({ markSeen: vi.fn() }),
}));

import PracticePageClient from '../PageClient';
import { markPracticeMode } from '@/lib/practice/practiceProgress';

beforeEach(() => {
  window.localStorage.clear();
  // Reset query params between tests.
  for (const k of Array.from(searchParamsValue.keys())) searchParamsValue.delete(k);
});

describe('PracticePageClient fluency: skip intro for completed modes', () => {
  it('first-time visit: shows the intro card', () => {
    render(<PracticePageClient mode="classic" locale="en" />);
    // ModeIntroCard renders the "intro" greet line, the sandbox does not.
    expect(screen.queryByTestId('practice-board')).toBeNull();
  });

  it('previously-completed mode: drops the player straight into the sandbox', () => {
    markPracticeMode('classic', 'en');
    render(<PracticePageClient mode="classic" locale="en" />);
    expect(screen.getByTestId('practice-board')).toBeInTheDocument();
  });

  it('explicit ?play=1 query param: skips intro even when not completed', () => {
    searchParamsValue.set('play', '1');
    render(<PracticePageClient mode="wordHunt" locale="en" />);
    expect(screen.getByTestId('practice-target')).toBeInTheDocument();
  });
});
