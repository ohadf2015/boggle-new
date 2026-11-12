import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { postWithAuth, getWithAuth, useAuth } = vi.hoisted(() => ({ postWithAuth: vi.fn(), getWithAuth: vi.fn(), useAuth: vi.fn() }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${JSON.stringify(p)}` : k),
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/utils/authFetch', () => ({ postWithAuth, getWithAuth }));
vi.mock('@/utils/coinEarnedFx', () => ({ emitCoinEarned: vi.fn() }));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn(), fireConfetti: vi.fn(), fireFireworks: vi.fn() }));
vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { DailyAllClearCard } from '../DailyAllClearCard';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';

describe('DailyAllClearCard: today\'s one chest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuth.mockReturnValue({ user: { id: 'u1' } });
    getWithAuth.mockResolvedValue(new Response(JSON.stringify({ fixed: false, opened: null }), { status: 200 }));
  });

  it('does not pay on show: the one chest, the big one, waits for a tap', () => {
    render(<DailyAllClearCard streak={2} />);
    expect(screen.getByTestId('today-chest-ready').getAttribute('data-kind')).toBe('perfect');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(postWithAuth).not.toHaveBeenCalled();
  });

  it('shows what an opened box held', () => {
    localStorage.setItem(
      `lc:day-prize:perfect:${getDailyChallengeDate()}`,
      JSON.stringify({ kind: 'perfect', tier: 'jackpot', coins: 150, xp: 100, claimed: true }),
    );
    render(<DailyAllClearCard streak={0} />);
    const opened = screen.getByTestId('today-chest-opened');
    expect(opened.getAttribute('data-tier')).toBe('jackpot');
    expect(opened.textContent).toContain('"coins":150');
    expect(screen.queryByTestId('all-clear-streak')).toBeNull();
  });

  it('tapping the perfect box opens the reveal', () => {
    render(<DailyAllClearCard streak={1} />);
    fireEvent.click(screen.getByTestId('today-chest-ready'));
    expect(screen.getByTestId('day-prize-reveal').getAttribute('data-phase')).toBe('closed');
  });

  it('guests see one sign-in line and no API call', () => {
    useAuth.mockReturnValue({ user: null });
    render(<DailyAllClearCard streak={1} />);
    expect(screen.getAllByTestId('today-chest-guest')).toHaveLength(1);
    expect(postWithAuth).not.toHaveBeenCalled();
    expect(getWithAuth).not.toHaveBeenCalled();
  });
});
