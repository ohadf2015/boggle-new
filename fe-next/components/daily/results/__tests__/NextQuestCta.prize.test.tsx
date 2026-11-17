import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { useAuth, getWithAuth } = vi.hoisted(() => ({ useAuth: vi.fn(), getWithAuth: vi.fn() }));

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/utils/authFetch', () => ({ postWithAuth: vi.fn(), getWithAuth }));
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
import { rememberOpenedPrize } from '@/components/daily/prize/dayPrizeStore';

const OPENED_PRIZE = {
  kind: 'clear' as const,
  tier: 'common' as const,
  coins: 20,
  xp: 50,
  claimed: false,
  fixed: false,
};

async function flushPrizePop() {
  await act(async () => {
    vi.advanceTimersByTime(PRIZE_POP_DELAY_MS + 10);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('NextQuestCta prize box', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    useAuth.mockReturnValue({ user: { id: 'u1' } });
    getWithAuth.mockResolvedValue({ ok: true, json: async () => ({ opened: null, fixed: false }) });
    playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: false, connections: false };
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => vi.useRealTimers());

  it('pops the day-clear box once after the second required quest, and still offers the next quest', async () => {
    const { unmount } = render(<NextQuestCta justFinished="word-hunt" currentLanguage="en" />);
    expect(screen.queryByTestId('day-prize-reveal')).toBeNull();
    expect(screen.getByTestId('milestone-popup').getAttribute('data-blocked')).toBe('false');
    await flushPrizePop();
    expect(screen.getByTestId('day-prize-reveal').getAttribute('data-phase')).toBe('closed');
    expect(screen.getByTestId('milestone-popup').getAttribute('data-blocked')).toBe('true');
    expect(screen.getByTestId('next-quest-cta').getAttribute('data-next-mode')).toBe('connections');
    unmount();

    render(<NextQuestCta justFinished="word-hunt" currentLanguage="en" />);
    await flushPrizePop();
    expect(screen.queryByTestId('day-prize-reveal')).toBeNull();
  });

  it('guests get no box', async () => {
    useAuth.mockReturnValue({ user: null });
    render(<NextQuestCta justFinished="word-hunt" currentLanguage="en" />);
    await flushPrizePop();
    expect(screen.queryByTestId('day-prize-reveal')).toBeNull();
  });

  it('after Word Wheel alone, Word Hunt is marked as the one that opens today\'s prize', async () => {
    playedStatus.today = { wordHunt: false, wordWheel: true, wordTower: false, connections: false };
    render(<NextQuestCta justFinished="word-wheel" currentLanguage="en" />);
    expect(screen.getByTestId('next-quest-one-to-go').textContent).toContain('daily.dayPrize.oneToGo');
    await flushPrizePop();
    expect(screen.queryByTestId('day-prize-reveal')).toBeNull();
  });

  it('the fourth quest pops the perfect-day box on the all-clear state', async () => {
    playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
    render(<NextQuestCta justFinished="word-tower" currentLanguage="en" />);
    await flushPrizePop();
    expect(screen.getByTestId('day-prize-reveal')).toBeTruthy();
    expect(screen.getByText('daily.dayPrize.titlePerfect')).toBeTruthy();
    expect(screen.getByTestId('next-quest-all-clear')).toBeTruthy();
  });

  it('does not pop the box when this device already opened it', async () => {
    rememberOpenedPrize({ ...OPENED_PRIZE, claimed: true });
    render(<NextQuestCta justFinished="word-hunt" currentLanguage="en" />);
    await flushPrizePop();
    expect(screen.queryByTestId('day-prize-reveal')).toBeNull();
  });

  it('does not pop the box when the server says it was already opened (other device)', async () => {
    getWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ opened: OPENED_PRIZE, fixed: false }),
    });
    render(<NextQuestCta justFinished="word-hunt" currentLanguage="en" />);
    await flushPrizePop();
    expect(screen.queryByTestId('day-prize-reveal')).toBeNull();
  });
});
