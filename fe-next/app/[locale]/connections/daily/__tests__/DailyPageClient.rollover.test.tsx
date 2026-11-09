/**
 * A Word Bridge daily left open (or an app brought back next morning) moves to
 * the new day once its result is on screen; a run still in play keeps its day.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import DailyPageClient from '../DailyPageClient';

vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => ({ loading: false, today: { wordHunt: false, wordWheel: false, wordTower: false, connections: false } }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k, dir: 'ltr' }),
}));
const { daily } = vi.hoisted(() => ({
  daily: (props: { today: string; onTerminal?: () => void }) => (
    <button type="button" data-testid="daily" data-day={props.today} onClick={() => props.onTerminal?.()} />
  ),
}));
vi.mock('@/components/connections/ConnectionsDailyChallenge', () => ({ default: daily }));
vi.mock('@/components/connections/pyramid/PyramidChallenge', () => ({ default: daily }));
vi.mock('@/lib/connections/dailyVariant', () => ({ dailyConnectionsVariant: () => 'regular' }));
vi.mock('@/lib/connections/pyramid/puzzles', () => ({ getPyramidsForLocale: () => [] }));

const nextMorning = () => {
  vi.setSystemTime(new Date('2026-11-13T07:00:00Z'));
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
};

describe('DailyPageClient day rollover', () => {
  beforeEach(() => {
    cleanup();
    localStorage.setItem('lc:connections-daily-tutorial-seen', '1');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T21:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('moves a finished day on to the new day when the player comes back', () => {
    render(<DailyPageClient locale="en" />);
    fireEvent.click(screen.getByTestId('daily'));
    nextMorning();
    expect(screen.getByTestId('daily').getAttribute('data-day')).toBe('2026-11-13');
  });

  it('keeps a run in play on the day it started', () => {
    render(<DailyPageClient locale="en" />);
    nextMorning();
    expect(screen.getByTestId('daily').getAttribute('data-day')).toBe('2026-11-12');
  });
});
