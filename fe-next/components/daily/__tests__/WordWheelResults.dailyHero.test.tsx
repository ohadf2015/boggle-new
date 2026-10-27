import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WordWheelResults from '../WordWheelResults';
import type { WordWheelGameResult } from '../WordWheelGame';
import { fireConfetti } from '@/utils/confettiUtils';

vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  animate: () => ({ stop: () => {} }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('../TabbedDailyLeaderboard', () => ({ __esModule: true, default: () => <div data-testid="leaderboard-stub" /> }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound: vi.fn() }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: unknown) => (typeof p === 'string' ? p : k), language: 'en' }),
}));
vi.mock('@/hooks/usePracticeFlag', () => ({ usePracticeFlag: () => false }));
vi.mock('../DailyInsightStack', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => ({
    today: { wordHunt: false, wordWheel: true, wordTower: false, connections: false },
    streak: { current: 5, longest: 9 }, allCompletedDates: [], freezeCount: 0, loading: false, fromServer: true, refresh: vi.fn(),
  }),
}));

const result: WordWheelGameResult = { score: 42, wordsFound: ['ANT', 'GAIN'], timeSeconds: 120 };
const renderResults = (props: Partial<React.ComponentProps<typeof WordWheelResults>> = {}) =>
  render(
    <WordWheelResults result={result} puzzleNumber={285} puzzleDate="2026-10-27" language="en" hasPlayedWordHunt={false} streakDays={5} {...props} />,
  );

describe('WordWheelResults — shared daily hero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it('Given a finished wheel, When results show, Then they open on the shared daily hero headed by the rank', () => {
    renderResults();
    const hero = screen.getByTestId('daily-results-hero');
    expect(hero.getAttribute('data-mode')).toBe('word-wheel');
    expect(within(hero).getByRole('heading', { level: 2 }).textContent).toBe('wordWheel.rank.onARoll');
    expect(hero.textContent).toContain('#285');
  });

  it('Given a run, When results show, Then the hero holds words found, longest word, rank meter and share row', () => {
    renderResults();
    const hero = screen.getByTestId('daily-results-hero');
    const stats = within(hero).getAllByTestId('daily-results-stat').map((s) => s.textContent);
    expect(stats).toHaveLength(2);
    expect(stats[0]).toContain('2');
    expect(stats[1]).toContain('GAIN');
    expect(within(hero).getByTestId('wheel-rank-meter')).toBeInTheDocument();
    expect(within(hero).getByTestId('word-wheel-share')).toBeInTheDocument();
  });

  it('Given the hero owns the streak, When results show, Then the wheel renders no second streak chip', () => {
    renderResults();
    expect(screen.queryByTestId('word-wheel-streak-chip')).toBeNull();
    expect(screen.getAllByTestId('daily-results-streak')).toHaveLength(1);
  });

  it('Given a fresh finish, When results show, Then the hero celebrates; a revisit does not', async () => {
    vi.useFakeTimers();
    const { unmount } = renderResults();
    vi.advanceTimersByTime(600);
    expect(fireConfetti).toHaveBeenCalledTimes(1);
    unmount();
    vi.clearAllMocks();
    renderResults({ alreadyPlayed: true });
    vi.advanceTimersByTime(600);
    expect(fireConfetti).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('Given the flow chrome owns the way back, When results show, Then there is no second back link', () => {
    renderResults();
    expect(screen.queryByRole('link', { name: /common\.back/ })).toBeNull();
  });
});
