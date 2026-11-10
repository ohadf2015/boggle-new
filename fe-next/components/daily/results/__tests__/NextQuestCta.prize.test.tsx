import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/utils/authFetch', () => ({ postWithAuth: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
const playedStatus = {
  today: { wordHunt: true, wordWheel: true, wordTower: false, connections: false },
  streak: { current: 1, longest: 1 }, loading: false, refresh: vi.fn(),
};
vi.mock('@/hooks/useDailyPlayedStatus', () => ({ useDailyPlayedStatus: () => playedStatus }));
vi.mock('@/components/streak/StreakMilestonePopup', () => ({
  StreakMilestonePopup: ({ blocked }: { blocked: boolean }) => <span data-testid="milestone-popup" data-blocked={String(blocked)} />,
}));

import { NextQuestCta, PRIZE_POP_DELAY_MS } from '../NextQuestCta';

describe('NextQuestCta prize box', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    useAuth.mockReturnValue({ user: { id: 'u1' } });
    playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: false, connections: false };
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => vi.useRealTimers());

  it('pops the day-clear box once after the second required quest, and still offers the next quest', () => {
    const { unmount } = render(<NextQuestCta justFinished="word-hunt" currentLanguage="en" />);
    expect(screen.queryByTestId('day-prize-reveal')).toBeNull();
    expect(screen.getByTestId('milestone-popup').getAttribute('data-blocked')).toBe('false');
    act(() => { vi.advanceTimersByTime(PRIZE_POP_DELAY_MS + 10); });
    expect(screen.getByTestId('day-prize-reveal').getAttribute('data-phase')).toBe('closed');
    expect(screen.getByTestId('milestone-popup').getAttribute('data-blocked')).toBe('true');
    expect(screen.getByTestId('next-quest-cta').getAttribute('data-next-mode')).toBe('connections');
    unmount();

    render(<NextQuestCta justFinished="word-hunt" currentLanguage="en" />);
    act(() => { vi.advanceTimersByTime(PRIZE_POP_DELAY_MS + 10); });
    expect(screen.queryByTestId('day-prize-reveal')).toBeNull();
  });

  it('guests get no box', () => {
    useAuth.mockReturnValue({ user: null });
    render(<NextQuestCta justFinished="word-hunt" currentLanguage="en" />);
    act(() => { vi.advanceTimersByTime(PRIZE_POP_DELAY_MS + 10); });
    expect(screen.queryByTestId('day-prize-reveal')).toBeNull();
  });

  it('after Word Wheel alone, Word Hunt is marked as the one that opens today\'s prize', () => {
    playedStatus.today = { wordHunt: false, wordWheel: true, wordTower: false, connections: false };
    render(<NextQuestCta justFinished="word-wheel" currentLanguage="en" />);
    expect(screen.getByTestId('next-quest-one-to-go').textContent).toContain('daily.dayPrize.oneToGo');
    act(() => { vi.advanceTimersByTime(PRIZE_POP_DELAY_MS + 10); });
    expect(screen.queryByTestId('day-prize-reveal')).toBeNull();
  });

  it('the fourth quest pops the perfect-day box on the all-clear state', () => {
    playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
    render(<NextQuestCta justFinished="word-tower" currentLanguage="en" />);
    act(() => { vi.advanceTimersByTime(PRIZE_POP_DELAY_MS + 10); });
    expect(screen.getByTestId('day-prize-reveal')).toBeTruthy();
    expect(screen.getByText('daily.dayPrize.titlePerfect')).toBeTruthy();
    expect(screen.getByTestId('next-quest-all-clear')).toBeTruthy();
  });
});
