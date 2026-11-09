import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const fx = vi.hoisted(() => ({
  postWithAuth: vi.fn(),
  getWithAuth: vi.fn(),
  emitCoinEarned: vi.fn(),
  fireConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  fireFireworks: vi.fn(),
  trackGrowthEvent: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/utils/authFetch', () => ({ postWithAuth: fx.postWithAuth, getWithAuth: fx.getWithAuth }));
vi.mock('@/utils/coinEarnedFx', () => ({ emitCoinEarned: fx.emitCoinEarned }));
vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: fx.fireConfetti,
  fireVictoryConfetti: fx.fireVictoryConfetti,
  fireFireworks: fx.fireFireworks,
}));
vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: fx.trackGrowthEvent }));
vi.mock('@/components/avatar/chest/ChestPartPrize', () => ({
  default: ({ drop, autoReveal }: { drop: { key: string }; autoReveal?: boolean }) => (
    <div data-testid="chest-part-prize" data-auto={String(!!autoReveal)}>{drop.key}</div>
  ),
}));

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
    fx.getWithAuth.mockResolvedValue(res(200, { fixed: false }));
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
    // A neutral line about today, never a tease about tomorrow.
    expect(screen.getByTestId('day-prize-line').textContent).toBe('daily.dayPrize.todayLine');
    expect(screen.getByTestId('day-prize-odds').textContent).toBe('daily.dayPrize.odds|{"common":75,"lucky":19,"jackpot":6}');
    expect(fx.fireFireworks).toHaveBeenCalled();
    expect(fx.emitCoinEarned).toHaveBeenCalledWith(100, undefined, { big: true });
    expect(readOpenedPrize('clear')?.coins).toBe(100);
  });

  it('a random box shows the avatar part it held, with the part odds', async () => {
    const part = { key: 'eyes:moonEye', category: 'eyes', partId: 'moonEye', rarity: 'epic', duplicate: false, refundCoins: 0 };
    fx.postWithAuth.mockResolvedValue(res(200, { kind: 'clear', tier: 'common', coins: 20, xp: 50, claimed: true, part }));
    render(<DayPrizeReveal kind="clear" source="test" onClose={() => {}} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByTestId('chest-part-odds')).toBeTruthy();
    await openBox();
    expect(screen.getByTestId('chest-part-prize').textContent).toBe('eyes:moonEye');
    expect(screen.getByTestId('chest-part-prize').getAttribute('data-auto')).toBe('true');
    expect(screen.queryByTestId('day-prize-line')).toBeNull();
    expect(readOpenedPrize('clear')?.part?.key).toBe('eyes:moonEye');
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

  it('Given a random box, When closed, Then the one small odds line shows and day_prize_shown says edu_fixed_prize false', async () => {
    render(<DayPrizeReveal kind="clear" source="test" onClose={() => {}} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByTestId('day-prize-odds')).toBeTruthy();
    expect(fx.trackGrowthEvent).toHaveBeenCalledWith('day_prize_shown', { kind: 'clear', source: 'test', edu_fixed_prize: false });
  });

  it('Given the education side, Then no odds line, no shake wait, no tier stamp, and both events say edu_fixed_prize', async () => {
    fx.getWithAuth.mockResolvedValue(res(200, { fixed: true }));
    fx.postWithAuth.mockResolvedValue(res(200, { kind: 'clear', tier: 'common', coins: 25, xp: 50, claimed: true, fixed: true }));
    render(<DayPrizeReveal kind="clear" source="test" onClose={() => {}} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.queryByTestId('day-prize-odds')).toBeNull();
    expect(fx.trackGrowthEvent).toHaveBeenCalledWith('day_prize_shown', { kind: 'clear', source: 'test', edu_fixed_prize: true });
    fireEvent.click(screen.getByTestId('day-prize-open'));
    // No anticipation: the box opens as soon as the server answers.
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByTestId('day-prize-reveal').getAttribute('data-phase')).toBe('open');
    expect(screen.queryByTestId('day-prize-stamp')).toBeNull();
    expect(screen.queryByTestId('day-prize-odds')).toBeNull();
    expect(screen.getByTestId('day-prize-coins').textContent).toContain('25');
    expect(fx.trackGrowthEvent).toHaveBeenCalledWith('day_prize_opened', expect.objectContaining({ edu_fixed_prize: true, coins: 25 }));
  });

  it('Later closes without claiming', () => {
    const onClose = vi.fn();
    render(<DayPrizeReveal kind="clear" source="test" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('day-prize-later'));
    expect(onClose).toHaveBeenCalled();
    expect(fx.postWithAuth).not.toHaveBeenCalled();
  });
});
