import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const fx = vi.hoisted(() => ({
  postWithAuth: vi.fn(),
  emitCoinEarned: vi.fn(),
  fireConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  fireFireworks: vi.fn(),
  trackGrowthEvent: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/utils/authFetch', () => ({ postWithAuth: fx.postWithAuth }));
vi.mock('@/utils/coinEarnedFx', () => ({ emitCoinEarned: fx.emitCoinEarned }));
vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: fx.fireConfetti,
  fireVictoryConfetti: fx.fireVictoryConfetti,
  fireFireworks: fx.fireFireworks,
}));
vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: fx.trackGrowthEvent }));

import { DayPrizeReveal, ANTICIPATION_MS, RETRY_MS } from '../DayPrizeReveal';
import { readOpenedPrize } from '../dayPrizeStore';

const res = (status: number, body?: unknown) => ({ ok: status < 300, status, json: async () => body });

async function openBox() {
  fireEvent.click(screen.getByTestId('day-prize-open'));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ANTICIPATION_MS + 50);
  });
}

describe('DayPrizeReveal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('starts closed and claims only on tap', () => {
    render(<DayPrizeReveal kind="clear" source="test" onClose={() => {}} />);
    expect(screen.getByTestId('day-prize-reveal').getAttribute('data-phase')).toBe('closed');
    expect(fx.postWithAuth).not.toHaveBeenCalled();
  });

  it('a jackpot fires fireworks, flies big coins and remembers the prize', async () => {
    fx.postWithAuth.mockResolvedValue(res(200, { kind: 'clear', tier: 'jackpot', coins: 100, xp: 50, claimed: true }));
    render(<DayPrizeReveal kind="clear" source="test" onClose={() => {}} />);
    await openBox();
    expect(fx.postWithAuth).toHaveBeenCalledWith('/api/daily/day-clear/claim');
    const dialog = screen.getByTestId('day-prize-reveal');
    expect(dialog.getAttribute('data-phase')).toBe('open');
    expect(dialog.getAttribute('data-tier')).toBe('jackpot');
    expect(screen.getByTestId('day-prize-stamp').textContent).toBe('daily.dayPrize.tier.jackpot');
    expect(screen.getByTestId('day-prize-line').textContent).toMatch(/^daily\.dayPrize\.lines\.jackpot\.[01]$/);
    expect(fx.fireFireworks).toHaveBeenCalled();
    expect(fx.emitCoinEarned).toHaveBeenCalledWith(100, undefined, { big: true });
    expect(readOpenedPrize('clear')?.coins).toBe(100);
  });

  it('a common box gets a small burst; a repeat open pays no coin flight', async () => {
    fx.postWithAuth.mockResolvedValue(res(200, { kind: 'perfect', tier: 'common', coins: 40, xp: 100, claimed: false }));
    render(<DayPrizeReveal kind="perfect" source="test" onClose={() => {}} />);
    await openBox();
    expect(fx.postWithAuth).toHaveBeenCalledWith('/api/daily/all-clear/claim');
    expect(fx.fireConfetti).toHaveBeenCalled();
    expect(fx.fireFireworks).not.toHaveBeenCalled();
    expect(fx.emitCoinEarned).not.toHaveBeenCalled();
  });

  it('asks again once when the score is still saving, then explains', async () => {
    fx.postWithAuth.mockResolvedValue(res(400));
    render(<DayPrizeReveal kind="clear" source="test" onClose={() => {}} />);
    await openBox();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RETRY_MS + 50);
    });
    expect(fx.postWithAuth).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('day-prize-reveal').getAttribute('data-phase')).toBe('not-cleared');
  });

  it('opens straight to the prize when this device already opened it', () => {
    localStorage.setItem(
      `lc:day-prize:clear:${new Date().toISOString().slice(0, 10)}`,
      JSON.stringify({ kind: 'clear', tier: 'lucky', coins: 50, xp: 50, claimed: true }),
    );
    render(<DayPrizeReveal kind="clear" source="test" onClose={() => {}} />);
    expect(screen.getByTestId('day-prize-reveal').getAttribute('data-tier')).toBe('lucky');
  });

  it('Later closes without claiming', () => {
    const onClose = vi.fn();
    render(<DayPrizeReveal kind="clear" source="test" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('day-prize-later'));
    expect(onClose).toHaveBeenCalled();
    expect(fx.postWithAuth).not.toHaveBeenCalled();
  });
});
