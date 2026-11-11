import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import type { StreakView } from '@/hooks/useStreakView';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
  }),
}));
vi.mock('@/lib/daily/streakClient', () => ({ claimStreakMilestoneRequest: vi.fn() }));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn(), fireFireworks: vi.fn() }));
vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: vi.fn() }));
vi.mock('@/utils/coinEarnedFx', () => ({ emitCoinEarned: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/utils/dailyChallenge/dateUtils', () => ({ getDailyChallengeDate: () => '2026-11-11' }));
vi.mock('next/dynamic', () => ({
  default: () => (props: { mode: string; source: string; milestone: { days: number }; onClose: () => void }) => (
    <div role="dialog" data-mode={props.mode} data-source={props.source}>
      {props.milestone.days}
      <button type="button" data-testid="stub-close" onClick={props.onClose} />
    </div>
  ),
}));

import { StreakMilestoneCheer, CHEER_DELAY_MS } from '../StreakMilestoneCheer';

function view(over: Partial<StreakView> = {}): StreakView {
  return {
    loading: false,
    isGuest: false,
    current: 7,
    playedToday: true,
    atRisk: false,
    freezes: 0,
    week: [],
    milestone: null,
    freezeSaved: null,
    refresh: vi.fn(),
    ...over,
  };
}

describe('StreakMilestoneCheer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('Given a fresh 7-day streak, cheers once in cheer mode, and not again on the next visit', () => {
    const { unmount } = render(<StreakMilestoneCheer view={view()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => vi.advanceTimersByTime(CHEER_DELAY_MS));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-mode', 'cheer');
    expect(dialog).toHaveAttribute('data-source', 'home');
    expect(dialog).toHaveTextContent('7');
    fireEvent.click(screen.getByTestId('stub-close'));
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    render(<StreakMilestoneCheer view={view()} />);
    act(() => vi.advanceTimersByTime(CHEER_DELAY_MS));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Given a guest on a 7-day device streak, cheers them too', () => {
    render(<StreakMilestoneCheer view={view({ isGuest: true })} />);
    act(() => vi.advanceTimersByTime(CHEER_DELAY_MS));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Given the streak is still loading, waits instead of guessing', () => {
    render(<StreakMilestoneCheer view={view({ loading: true })} />);
    act(() => vi.advanceTimersByTime(CHEER_DELAY_MS * 2));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Given the same milestone has a coin reward waiting, leaves the moment to the claim', () => {
    render(<StreakMilestoneCheer view={view({ milestone: { claimable: { days: 7, coins: 60 }, next: null } })} />);
    act(() => vi.advanceTimersByTime(CHEER_DELAY_MS));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Given a 6-day streak, stays quiet', () => {
    render(<StreakMilestoneCheer view={view({ current: 6 })} />);
    act(() => vi.advanceTimersByTime(CHEER_DELAY_MS));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
