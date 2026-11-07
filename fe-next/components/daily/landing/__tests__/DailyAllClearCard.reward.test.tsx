import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { postWithAuth, useAuth } = vi.hoisted(() => ({ postWithAuth: vi.fn(), useAuth: vi.fn() }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${JSON.stringify(p)}` : k),
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/utils/authFetch', () => ({ postWithAuth }));
vi.mock('@/utils/coinEarnedFx', () => ({ emitCoinEarned: vi.fn() }));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn(), fireConfetti: vi.fn(), fireFireworks: vi.fn() }));
vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { DailyAllClearCard } from '../DailyAllClearCard';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';

describe('DailyAllClearCard prize boxes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuth.mockReturnValue({ user: { id: 'u1' } });
  });

  it('does not pay on show: both boxes wait for a tap', () => {
    render(<DailyAllClearCard streak={2} />);
    expect(screen.getByTestId('day-prize-waiting-clear')).toBeTruthy();
    expect(screen.getByTestId('day-prize-waiting-perfect')).toBeTruthy();
    expect(postWithAuth).not.toHaveBeenCalled();
  });

  it('shows what an opened box held', () => {
    localStorage.setItem(
      `lc:day-prize:perfect:${getDailyChallengeDate()}`,
      JSON.stringify({ kind: 'perfect', tier: 'jackpot', coins: 150, xp: 100, claimed: true }),
    );
    render(<DailyAllClearCard streak={0} />);
    const opened = screen.getByTestId('day-prize-opened-perfect');
    expect(opened.getAttribute('data-tier')).toBe('jackpot');
    expect(opened.textContent).toContain('"coins":150');
    expect(screen.queryByTestId('all-clear-streak')).toBeNull();
  });

  it('tapping the perfect box opens the reveal', () => {
    render(<DailyAllClearCard streak={1} />);
    fireEvent.click(screen.getByTestId('day-prize-waiting-perfect'));
    expect(screen.getByTestId('day-prize-reveal').getAttribute('data-phase')).toBe('closed');
  });

  it('guests see one sign-in line, for the perfect-day box, and no API call', () => {
    useAuth.mockReturnValue({ user: null });
    render(<DailyAllClearCard streak={1} />);
    expect(screen.queryByTestId('day-prize-guest-clear')).toBeNull();
    expect(screen.getByTestId('day-prize-guest-perfect').textContent).toContain('daily.allClear.guestNudge');
    expect(postWithAuth).not.toHaveBeenCalled();
  });
});
