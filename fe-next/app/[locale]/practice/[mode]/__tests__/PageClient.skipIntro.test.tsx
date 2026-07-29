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
  useLanguageSafe: () => ({ language: 'en', t: (k: string) => k }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Sandboxes mount the real <GridComponent>; stub it so this fluency test
// doesn't pull in framer-motion / cosmetic / earthquake context chains.
vi.mock('@/components/GridComponent', () => ({
  default: () => <div data-testid="grid-component-stub" />,
}));
vi.mock('pixi.js', () => ({
  Application: class {
    canvas = document.createElement('canvas');
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  },
}));
vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: vi.fn().mockResolvedValue({ isValid: false }) }),
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
  // FTUE gate: pretend onboarding is complete so the gate lets the page render.
  // Tests that target first-time-user redirect behavior live separately.
  window.localStorage.setItem('lexiclash_onboarding_completed', 'true');
  // Reset query params between tests.
  for (const k of Array.from(searchParamsValue.keys())) searchParamsValue.delete(k);
  // Default viewport: mobile. Individual tests override for desktop.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia;
});

describe('PracticePageClient fluency: skip intro for completed modes', () => {
  it('first-time visit: shows the merged tutorial sheet (intro + tips), not sandbox', () => {
    render(<PracticePageClient mode="classic" locale="en" />);
    expect(screen.queryByTestId('practice-board')).toBeNull();
    // The merged sheet is the tutorial — exposes the cta button as a skip-target.
    expect(screen.getByTestId('practice-tutorial-sheet')).toBeInTheDocument();
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

  it('desktop viewport: skips tutorial and drops the player straight into the sandbox', () => {
    // Desktop players don't need the tap-by-tap walkthrough — the larger
    // viewport and pointer affordances make the sandbox self-evident, and the
    // tutorial sheet otherwise feels like a roadblock between the hub click
    // and actually playing. Mobile keeps the tutorial.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('768'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })) as unknown as typeof window.matchMedia;
    render(<PracticePageClient mode="classic" locale="en" />);
    expect(screen.queryByTestId('practice-tutorial-sheet')).toBeNull();
    expect(screen.getByTestId('practice-board')).toBeInTheDocument();
  });
});
