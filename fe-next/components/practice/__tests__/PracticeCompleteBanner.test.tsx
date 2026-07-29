/**
 * PracticeCompleteBanner — celebrates the moment a player crosses a mode's
 * completion goal. As of 2026-05-03 also folds in the practice-streak day so
 * the milestone is felt where it's earned, not just on the hub.
 *
 * Audit ref: practice/onboarding audit 2026-05-03 §1+§2 ("Streak invisible",
 * "Chain CTA flat" — banner is the bridge between completion and chain CTA).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${JSON.stringify(p)}` : k),
  }),
}));

import PracticeCompleteBanner from '../PracticeCompleteBanner';
import {
  recordPracticeSession,
  resetPracticeStreak,
} from '@/hooks/usePracticeStreak';

beforeEach(() => {
  window.localStorage.clear();
  resetPracticeStreak();
});

describe('PracticeCompleteBanner', () => {
  it('renders the completion title + mode label', () => {
    render(<PracticeCompleteBanner mode="classic" />);
    expect(screen.getByTestId('practice-complete-banner')).toBeInTheDocument();
    expect(screen.getByTestId('practice-complete-banner').textContent).toContain(
      'practice.complete.title'
    );
    expect(screen.getByTestId('practice-complete-banner').textContent).toContain(
      'practice.complete.classic'
    );
  });

  it('never renders a streak chip — practice teaches, it is not scored gameplay', () => {
    // Even with an active streak recorded, the tutorial completion moment
    // stays free of streak pressure.
    recordPracticeSession();
    render(<PracticeCompleteBanner mode="classic" />);
    expect(screen.queryByTestId('practice-complete-banner-streak')).toBeNull();
  });
});
