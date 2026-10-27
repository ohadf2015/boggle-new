/**
 * First-time Word Bridge players learn by playing one easy riddle before the
 * daily starts. It shows once (marked at show time), never for players who
 * already finished a Word Bridge daily, and "How to play" brings it back
 * without losing the run in progress.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import DailyPageClient from '../DailyPageClient';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k, dir: 'ltr' }),
}));
const mounts = vi.hoisted(() => ({ game: 0 }));
vi.mock('@/components/connections/ConnectionsDailyChallenge', async () => {
  const React = await import('react');
  return {
    default: function Game() {
      React.useEffect(() => { mounts.game += 1; }, []);
      return <div data-testid="regular-daily" />;
    },
  };
});
vi.mock('@/components/connections/pyramid/PyramidChallenge', () => ({ default: () => <div data-testid="pyramid-daily" /> }));
vi.mock('@/components/connections/tutorial/BridgeTutorial', () => ({
  default: ({ onDone }: { onDone: () => void }) => (
    <button type="button" data-testid="bridge-tutorial" onClick={onDone} />
  ),
}));
vi.mock('@/lib/connections/dailyVariant', () => ({ dailyConnectionsVariant: () => 'regular' }));
vi.mock('@/lib/connections/pyramid/puzzles', () => ({ getPyramidsForLocale: () => [{ id: 'p1' }] }));

const SEEN = 'lc:connections-daily-tutorial-seen';

describe('DailyPageClient — first-run tutorial', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    mounts.game = 0;
  });

  it('Given a first visit, Then the tutorial shows instead of the game and is marked seen right away', () => {
    render(<DailyPageClient locale="en" />);
    expect(screen.getByTestId('bridge-tutorial')).toBeTruthy();
    expect(screen.queryByTestId('regular-daily')).toBeNull();
    expect(localStorage.getItem(SEEN)).toBe('1');
  });

  it('Given the tutorial is finished, Then today’s game starts', () => {
    render(<DailyPageClient locale="en" />);
    fireEvent.click(screen.getByTestId('bridge-tutorial'));
    expect(screen.getByTestId('regular-daily')).toBeTruthy();
    expect(screen.queryByTestId('bridge-tutorial')).toBeNull();
  });

  it('Given a returning player, Then the game opens directly', () => {
    localStorage.setItem('connections-daily-played', '2026-10-01');
    render(<DailyPageClient locale="en" />);
    expect(screen.getByTestId('regular-daily')).toBeTruthy();
    expect(screen.queryByTestId('bridge-tutorial')).toBeNull();
  });

  it('Given a run in progress, When "How to play" is tapped, Then the tutorial opens and closing it returns to the same run', () => {
    localStorage.setItem(SEEN, '1');
    render(<DailyPageClient locale="en" />);
    expect(mounts.game).toBe(1);
    fireEvent.click(screen.getByTestId('connections-how-to-play'));
    expect(screen.getByTestId('bridge-tutorial')).toBeTruthy();
    fireEvent.click(screen.getByTestId('bridge-tutorial'));
    expect(screen.getByTestId('regular-daily')).toBeTruthy();
    expect(mounts.game).toBe(1);
  });
});
