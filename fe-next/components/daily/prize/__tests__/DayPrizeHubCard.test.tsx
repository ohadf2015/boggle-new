import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/utils/authFetch', () => ({ postWithAuth: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { DayPrizeHubCard } from '../DayPrizeHubCard';
import { DAY_PRIZE_TABLE } from '@/lib/daily/dayPrize';

describe('DayPrizeHubCard', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuth.mockReturnValue({ user: { id: 'u1' } });
  });

  it('waits with an Open button and opens the box on tap', () => {
    render(<DayPrizeHubCard kind="clear" />);
    fireEvent.click(screen.getByTestId('day-prize-waiting-clear'));
    expect(screen.getByTestId('day-prize-reveal')).toBeTruthy();
  });

  it('after opening shows the amount and a rare tier', () => {
    localStorage.setItem(
      `lc:day-prize:clear:${new Date().toISOString().slice(0, 10)}`,
      JSON.stringify({ kind: 'clear', tier: 'lucky', coins: 50, xp: 50, claimed: true }),
    );
    render(<DayPrizeHubCard kind="clear" />);
    const row = screen.getByTestId('day-prize-opened-clear');
    expect(row.textContent).toContain('"coins":50');
    expect(row.textContent).toContain('daily.dayPrize.tier.lucky');
  });

  it('guests see the best box they could open', () => {
    useAuth.mockReturnValue({ user: null });
    render(<DayPrizeHubCard kind="clear" />);
    expect(screen.getByTestId('day-prize-guest-clear').textContent).toContain(`"coins":${DAY_PRIZE_TABLE.clear.jackpot}`);
  });
});
