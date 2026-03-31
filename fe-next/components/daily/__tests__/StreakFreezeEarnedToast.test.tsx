/**
 * StreakFreezeEarnedToast Component Tests
 */
import { render, screen, act } from '@testing-library/react';
import { StreakFreezeEarnedToast } from '../StreakFreezeEarnedToast';

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'daily.streakFreezeEarned': 'You earned a Streak Freeze!',
    'daily.streakFreeze': 'Streak Freeze',
  };
  return translations[key] || key;
};

describe('StreakFreezeEarnedToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders earned message', () => {
    render(<StreakFreezeEarnedToast freezeCount={1} t={mockT} onDismiss={() => {}} />);
    expect(screen.getByText('You earned a Streak Freeze!')).toBeInTheDocument();
  });

  test('shows current freeze count', () => {
    render(<StreakFreezeEarnedToast freezeCount={2} t={mockT} onDismiss={() => {}} />);
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  test('auto-dismisses after 4 seconds', () => {
    const onDismiss = vi.fn();
    render(<StreakFreezeEarnedToast freezeCount={1} t={mockT} onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(4000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
