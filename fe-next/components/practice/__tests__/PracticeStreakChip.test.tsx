/**
 * PracticeStreakChip — surfaces the (already-computed but never-rendered)
 * `usePracticeStreak` value on the hub. Hidden when streak === 0 so a brand-new
 * player isn't shown a "Day 0" zero-state on their first hub visit.
 *
 * Audit ref: practice/onboarding audit 2026-05-03 §1 ("Streak invisible").
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) =>
      p ? `${k}|${JSON.stringify(p)}` : k,
  }),
}));

import { vi } from 'vitest';
import PracticeStreakChip from '../PracticeStreakChip';
import { recordPracticeSession, resetPracticeStreak } from '@/hooks/usePracticeStreak';

beforeEach(() => {
  window.localStorage.clear();
  resetPracticeStreak();
});

describe('PracticeStreakChip', () => {
  it('renders nothing when the streak is 0 (no zero-state noise)', () => {
    const { container } = render(<PracticeStreakChip />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the current streak day count once it has been recorded', () => {
    recordPracticeSession();
    render(<PracticeStreakChip />);
    expect(screen.getByTestId('practice-streak-chip')).toBeInTheDocument();
    expect(screen.getByTestId('practice-streak-chip').textContent).toContain('1');
  });

  it('uses the practiceHub.streakDays translation key with day count', () => {
    recordPracticeSession();
    render(<PracticeStreakChip />);
    expect(screen.getByTestId('practice-streak-chip').textContent).toContain(
      'practiceHub.streakDays'
    );
  });
});
