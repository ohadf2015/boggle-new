import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
  }),
}));
vi.mock('@/lib/daily/streakClient', () => ({ buyStreakFreezeRequest: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { buyStreakFreezeRequest } from '@/lib/daily/streakClient';
import { StreakFreezeSheet } from '../StreakFreezeSheet';
import { FREEZE_PRICE } from '@/lib/daily/streakRewards';

describe('StreakFreezeSheet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given a guest, asks to sign in instead of selling', () => {
    const onSignIn = vi.fn();
    render(<StreakFreezeSheet open freezes={0} isGuest onSignIn={onSignIn} onClose={vi.fn()} onBought={vi.fn()} />);
    expect(screen.queryByTestId('streak-freeze-buy')).toBeNull();
    fireEvent.click(screen.getByTestId('streak-freeze-signin'));
    expect(onSignIn).toHaveBeenCalled();
  });

  it('Given two freezes held, shows the cap and no buy button', () => {
    render(<StreakFreezeSheet open freezes={2} isGuest={false} onSignIn={vi.fn()} onClose={vi.fn()} onBought={vi.fn()} />);
    expect(screen.queryByTestId('streak-freeze-buy')).toBeNull();
    expect(screen.getByTestId('streak-freeze-full')).toBeInTheDocument();
  });

  it('buys one freeze for the server price and reports the new count', async () => {
    const onBought = vi.fn();
    vi.mocked(buyStreakFreezeRequest).mockResolvedValue({ ok: true, freezes: 1, newBalance: 50 });
    render(<StreakFreezeSheet open freezes={0} isGuest={false} onSignIn={vi.fn()} onClose={vi.fn()} onBought={onBought} />);
    const buy = screen.getByTestId('streak-freeze-buy');
    expect(buy).toHaveTextContent(`dailyStreak.flame.buy:${FREEZE_PRICE}`);
    fireEvent.click(buy);
    await waitFor(() => expect(onBought).toHaveBeenCalledWith(1));
  });

  it('Given too few coins, says how many it costs', async () => {
    vi.mocked(buyStreakFreezeRequest).mockResolvedValue({ ok: false, reason: 'insufficient_coins' });
    render(<StreakFreezeSheet open freezes={0} isGuest={false} onSignIn={vi.fn()} onClose={vi.fn()} onBought={vi.fn()} />);
    fireEvent.click(screen.getByTestId('streak-freeze-buy'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(`dailyStreak.flame.needCoins:${FREEZE_PRICE}`));
  });

  it('renders nothing when closed', () => {
    render(<StreakFreezeSheet open={false} freezes={0} isGuest={false} onSignIn={vi.fn()} onClose={vi.fn()} onBought={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
