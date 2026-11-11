import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
let mockReducedEffects = false;
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [mockReducedEffects, vi.fn()] }));

import { trackGrowthEvent } from '@/utils/growthTracking';
import { StreakSavedToast, SAVED_MOMENT_MS } from '../StreakSavedToast';

const saved = { date: '2026-11-10', freezesRemaining: 1 };

describe('StreakSavedToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    mockReducedEffects = false;
  });
  afterEach(() => vi.useRealTimers());

  it('Given a freeze was spent, the mascot breaks out of the ice and says the streak is safe, once', () => {
    const { unmount } = render(<StreakSavedToast saved={saved} />);
    const moment = screen.getByTestId('streak-saved-moment');
    expect(moment).toHaveTextContent('dailyStreak.freezeUsed');
    expect(moment).toHaveTextContent('dailyStreak.streak_freeze_toast_message');
    expect(screen.getByTestId('streak-mascot-act')).toHaveAttribute('data-act', 'iceBreak');
    expect(trackGrowthEvent).toHaveBeenCalledWith('streak_freeze_saved', { date: saved.date, freezesRemaining: 1 });
    act(() => vi.advanceTimersByTime(SAVED_MOMENT_MS));
    expect(screen.queryByTestId('streak-saved-moment')).toBeNull();
    unmount();
    render(<StreakSavedToast saved={saved} />);
    expect(screen.queryByTestId('streak-saved-moment')).toBeNull();
  });

  it('dismisses on tap without waiting', () => {
    render(<StreakSavedToast saved={saved} />);
    fireEvent.click(screen.getByTestId('streak-saved-moment'));
    expect(screen.queryByTestId('streak-saved-moment')).toBeNull();
  });

  it('Given reduce effects, shows a still mascot', () => {
    mockReducedEffects = true;
    render(<StreakSavedToast saved={saved} />);
    expect(screen.getByTestId('streak-mascot-act')).toHaveAttribute('data-still', 'true');
  });
});
