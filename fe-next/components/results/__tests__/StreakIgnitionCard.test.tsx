/**
 * StreakIgnitionCard — RED phase (t_89663cfc "Streak Ignition")
 *
 * The first-session win moment dead-ended: the streak incremented invisibly
 * (useWinStreak tracked, nothing mounted). This card makes the streak the
 * payoff of the solo results screen — won and lost variants — and fires
 * `growth:streak_ignition_shown` exactly once per view, with the truthful
 * loaded streak (never the pre-localStorage default).
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockTrackGrowthEvent } = vi.hoisted(() => ({
  mockTrackGrowthEvent: vi.fn(),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: any[]) => mockTrackGrowthEvent(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'results.streakIgnition.titleWon': 'STREAK IGNITED!',
        'results.streakIgnition.titleLost': 'ONE WIN TO IGNITE',
        'results.streakIgnition.body':
          'You played today. Come back tomorrow to keep the flame alive — miss a day and it goes out.',
        'results.streakIgnition.bodyLost':
          "Win one game and your streak begins. You're closer than you think.",
      };
      if (key === 'results.streakIgnition.day' && params) return `Day ${params.n}`;
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

import StreakIgnitionCard from '../StreakIgnitionCard';

describe('StreakIgnitionCard', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
  });

  it('won variant: shows the ignition title, body and a 7-day row with the played days lit', () => {
    render(<StreakIgnitionCard won currentStreak={1} isLoaded />);

    expect(screen.getByText('STREAK IGNITED!')).toBeInTheDocument();
    expect(screen.getByText(/Come back tomorrow to keep the flame alive/)).toBeInTheDocument();

    const cells = screen.getAllByTestId(/^streak-day-\d+$/);
    expect(cells).toHaveLength(7);
    expect(screen.getByTestId('streak-day-1')).toHaveAttribute('data-lit', 'true');
    expect(screen.getByTestId('streak-day-2')).toHaveAttribute('data-lit', 'false');
    expect(screen.getByTestId('streak-day-7')).toHaveAttribute('data-lit', 'false');
  });

  it('lights every earned day truthfully when the streak is longer', () => {
    render(<StreakIgnitionCard won currentStreak={3} isLoaded />);

    expect(screen.getByTestId('streak-day-1')).toHaveAttribute('data-lit', 'true');
    expect(screen.getByTestId('streak-day-2')).toHaveAttribute('data-lit', 'true');
    expect(screen.getByTestId('streak-day-3')).toHaveAttribute('data-lit', 'true');
    expect(screen.getByTestId('streak-day-4')).toHaveAttribute('data-lit', 'false');
  });

  it('lost variant: shows the one-win-to-ignite copy with nothing lit', () => {
    render(<StreakIgnitionCard won={false} currentStreak={0} isLoaded />);

    expect(screen.getByText('ONE WIN TO IGNITE')).toBeInTheDocument();
    expect(screen.getByText(/Win one game and your streak begins/)).toBeInTheDocument();
    expect(screen.getByTestId('streak-day-1')).toHaveAttribute('data-lit', 'false');
  });

  it('fires growth:streak_ignition_shown once the streak has loaded, with day/won/variant', () => {
    render(<StreakIgnitionCard won currentStreak={1} isLoaded />);

    expect(mockTrackGrowthEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('streak_ignition_shown', {
      day: 1,
      won: true,
      variant: 'won',
    });
  });

  it('does not fire the shown event before localStorage data has loaded (no day:0 noise)', () => {
    render(<StreakIgnitionCard won currentStreak={0} isLoaded={false} />);

    expect(mockTrackGrowthEvent).not.toHaveBeenCalled();
  });

  it('fires the event exactly once even when the streak value settles after load', () => {
    const { rerender } = render(<StreakIgnitionCard won currentStreak={0} isLoaded={false} />);
    rerender(<StreakIgnitionCard won currentStreak={2} isLoaded />);
    rerender(<StreakIgnitionCard won currentStreak={2} isLoaded />);

    expect(mockTrackGrowthEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('streak_ignition_shown', {
      day: 2,
      won: true,
      variant: 'won',
    });
  });

  it('reserves vertical space before the streak loads (CLS = 0)', () => {
    const { container } = render(<StreakIgnitionCard won currentStreak={0} isLoaded={false} />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).toMatch(/min-h-/);
  });

  it('does not hardcode ltr on the day row (RTL inherits dir)', () => {
    render(<StreakIgnitionCard won currentStreak={1} isLoaded />);

    const row = screen.getByTestId('streak-day-row');
    expect(row).not.toHaveAttribute('dir', 'ltr');
  });
});
