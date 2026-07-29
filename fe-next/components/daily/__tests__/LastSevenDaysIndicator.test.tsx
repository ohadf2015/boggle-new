/**
 * Tests for LastSevenDaysIndicator — visual progress toward DEDICATION
 * (7 unique days played). Each day is "done" if either Word Hunt or
 * Word Wheel has a local result for that date.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LastSevenDaysIndicator from '../LastSevenDaysIndicator';
import type { DailyCompletionDay } from '@/utils/dailyChallenge/storage';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    dir: 'ltr',
  }),
}));

function makeDays(completed: number): DailyCompletionDay[] {
  const dates = [
    '2026-04-15', '2026-04-16', '2026-04-17', '2026-04-18',
    '2026-04-19', '2026-04-20', '2026-04-21',
  ];
  return dates.map((date, i) => ({
    date,
    wordHunt: i < completed,
    wordWheel: false,
  }));
}

describe('LastSevenDaysIndicator', () => {
  it('renders 7 day squares', () => {
    render(<LastSevenDaysIndicator days={makeDays(0)} />);
    const squares = screen.getAllByTestId(/^last-seven-day-/);
    expect(squares).toHaveLength(7);
  });

  it('marks completed days with the completed class', () => {
    render(<LastSevenDaysIndicator days={makeDays(3)} />);
    const completed = screen.getAllByTestId(/^last-seven-day-/).filter((el) =>
      el.className.includes('bg-neo-lime')
    );
    expect(completed).toHaveLength(3);
  });

  it('shows progress label "X / 7"', () => {
    render(<LastSevenDaysIndicator days={makeDays(4)} />);
    expect(screen.getByText(/4\s*\/\s*7/)).toBeInTheDocument();
  });

  it('counts a day completed when wordWheel is played even if wordHunt is not', () => {
    const days: DailyCompletionDay[] = makeDays(0).map((d, i) => ({
      ...d,
      wordWheel: i === 2 || i === 5,
    }));
    render(<LastSevenDaysIndicator days={days} />);
    expect(screen.getByText(/2\s*\/\s*7/)).toBeInTheDocument();
  });
});
