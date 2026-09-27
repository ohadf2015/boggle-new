/**
 * Tests for LastSevenDaysIndicator — visual progress toward DEDICATION
 * (7 unique days played). Each day is "done" if either Word Hunt or
 * Word Wheel has a local result for that date.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LastSevenDaysIndicator from '../LastSevenDaysIndicator';
import type { DailyCompletionDay } from '@/utils/dailyChallenge/storage';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: 'en',
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

// ------------------------------------------------------------------
// Tapping a day tile must always do something (missed tiles used to be
// dead divs — "clicking a missed daily does nothing").
// ------------------------------------------------------------------
const { neoInfoToast } = vi.hoisted(() => ({ neoInfoToast: vi.fn() }));
vi.mock('@/components/NeoToast', () => ({ neoInfoToast }));


describe('LastSevenDaysIndicator — tappable days', () => {
  const today = '2026-04-21';

  it('Given a missed day inside the catch-up window, When rendered, Then the tile links to that day\'s catch-up play', () => {
    render(<LastSevenDaysIndicator days={makeDays(0)} today={today} />);
    // 2026-04-20 = yesterday, 2026-04-18 = 3 days ago (still in window)
    const yesterday = screen.getByTestId('last-seven-day-5');
    expect(yesterday.tagName).toBe('A');
    expect(yesterday).toHaveAttribute('href', '/en/daily/word-hunt?date=2026-04-20');
    expect(yesterday).toHaveAttribute('data-day-state', 'play');
    const threeDaysAgo = screen.getByTestId('last-seven-day-3');
    expect(threeDaysAgo).toHaveAttribute('href', '/en/daily/word-hunt?date=2026-04-18');
  });

  it('Given a missed day outside the window, When tapped, Then an explanatory toast fires and nothing navigates', () => {
    render(<LastSevenDaysIndicator days={makeDays(0)} today={today} />);
    const tooOld = screen.getByTestId('last-seven-day-0'); // 2026-04-15, 6 days ago
    expect(tooOld.tagName).toBe('BUTTON');
    expect(tooOld).toHaveAttribute('data-day-state', 'expired');
    fireEvent.click(tooOld);
    expect(neoInfoToast).toHaveBeenCalledWith('daily.catchUp.expired', expect.anything());
  });

  it('Given a completed day, When rendered, Then the tile links to that day\'s archive results', () => {
    render(<LastSevenDaysIndicator days={makeDays(3)} today={today} />);
    const done = screen.getByTestId('last-seven-day-0');
    expect(done.tagName).toBe('A');
    expect(done).toHaveAttribute('href', '/en/daily/archive/2026-04-15');
    expect(done).toHaveAttribute('data-day-state', 'done');
  });

  it('Given today unplayed, When rendered, Then the tile links to the hub', () => {
    render(<LastSevenDaysIndicator days={makeDays(0)} today={today} />);
    const todayTile = screen.getByTestId('last-seven-day-6');
    expect(todayTile).toHaveAttribute('href', '/en/daily');
    expect(todayTile).toHaveAttribute('data-day-state', 'today');
  });

  it('Given any missed day in the window, When rendered, Then a "tap to catch up" hint is shown', () => {
    render(<LastSevenDaysIndicator days={makeDays(0)} today={today} />);
    expect(screen.getByText('daily.catchUp.tileHint')).toBeInTheDocument();
  });
});
