/**
 * TomorrowCard — post-game daily streak / tomorrow hook.
 *
 * Persistent card after every finished game (not first-session only): finish
 * today's remaining daily, or keep-streak countdown once today's hub is done.
 * Dismissible for the session; CTA navigates to /{locale}/daily.
 */

import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockTrackGrowthEvent, mockIsDailyHubDoneLocally } = vi.hoisted(() => ({
  mockTrackGrowthEvent: vi.fn(),
  mockIsDailyHubDoneLocally: vi.fn(),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: any[]) => mockTrackGrowthEvent(...args),
}));

vi.mock('@/lib/results/isDailyHubDoneLocally', () => ({
  isDailyHubDoneLocally: (...args: any[]) => mockIsDailyHubDoneLocally(...args),
}));

vi.mock('@/hooks/useWinStreak', () => ({
  useWinStreak: () => ({ currentStreak: 0, isLoaded: true }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (key === 'results.tomorrowCard.countdown' && params) {
        return `New puzzle in ${params.time}`;
      }
      if (key === 'results.tomorrowCard.streakLabel' && params) {
        return `Day ${params.n}`;
      }
      const translations: Record<string, string> = {
        'results.tomorrowCard.title': 'TOMORROW: new Daily Challenge',
        'results.tomorrowCard.titleFinish': 'Finish today\'s daily',
        'results.tomorrowCard.titleKeep': 'Streak safe',
        'results.tomorrowCard.ctaFinish': 'Play daily',
        'results.tomorrowCard.ctaKeep': 'See tomorrow\'s daily',
        'results.tomorrowCard.dismiss': 'Dismiss',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

import TomorrowCard, { formatCountdown, getSecondsToMidnight } from '../TomorrowCard';

const DISMISS_KEY = 'lc:tomorrow-card-dismissed';

describe('TomorrowCard', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
    mockIsDailyHubDoneLocally.mockReturnValue(false);
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders finish-today variant for returning players when daily is open', () => {
    render(<TomorrowCard source="solo" streak={3} isStreakLoaded />);

    expect(screen.getByText("Finish today's daily")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Play daily' })).toHaveAttribute('href', '/en/daily');
    expect(screen.getByText('Day 3')).toBeInTheDocument();
  });

  it('renders keep-streak countdown when daily is already done', () => {
    render(<TomorrowCard source="solo" dailyDoneToday streak={5} isStreakLoaded />);

    expect(screen.getByText('Streak safe')).toBeInTheDocument();
    expect(screen.getByTestId('tomorrow-countdown').textContent).toMatch(
      /^New puzzle in \d{2}:\d{2}:\d{2}$/,
    );
    expect(screen.getByRole('link', { name: "See tomorrow's daily" })).toHaveAttribute('href', '/en/daily');
  });

  it('fires growth:tomorrow_card_shown once with variant + source props', () => {
    render(<TomorrowCard source="mp" dailyDoneToday={false} streak={2} isStreakLoaded />);

    expect(mockTrackGrowthEvent).toHaveBeenCalledTimes(1);
    const [event, data] = mockTrackGrowthEvent.mock.calls[0];
    expect(event).toBe('tomorrow_card_shown');
    expect(data.variant).toBe('finish-today');
    expect(data.source).toBe('mp');
    expect(data.daily_done).toBe(false);
    expect(data.streak).toBe(2);
    expect(data.seconds_to_midnight).toBeGreaterThan(0);
  });

  it('fires postgame_daily_cta_clicked on CTA click', () => {
    render(<TomorrowCard source="solo" dailyDoneToday={false} streak={0} isStreakLoaded />);
    fireEvent.click(screen.getByRole('link', { name: 'Play daily' }));
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('postgame_daily_cta_clicked', {
      variant: 'finish-today',
      source: 'solo',
    });
  });

  it('hides after dismiss and remembers for the session', () => {
    const { rerender } = render(<TomorrowCard source="solo" dailyDoneToday={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(sessionStorage.getItem(DISMISS_KEY)).toBe('1');
    expect(screen.queryByText("Finish today's daily")).not.toBeInTheDocument();

    rerender(<TomorrowCard source="solo" dailyDoneToday={false} />);
    expect(screen.queryByText("Finish today's daily")).not.toBeInTheDocument();
  });

  it('does not invent a streak line before load or when streak is 0', () => {
    const { rerender } = render(
      <TomorrowCard source="solo" dailyDoneToday={false} streak={0} isStreakLoaded={false} />,
    );
    expect(screen.queryByText(/Day /)).not.toBeInTheDocument();

    rerender(<TomorrowCard source="solo" dailyDoneToday={false} streak={0} isStreakLoaded />);
    expect(screen.queryByText(/Day /)).not.toBeInTheDocument();
  });

  it('ticks the countdown down every second on keep-streak', () => {
    vi.useFakeTimers();
    render(<TomorrowCard source="solo" dailyDoneToday streak={1} isStreakLoaded />);

    const before = screen.getByTestId('tomorrow-countdown').textContent;
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const after = screen.getByTestId('tomorrow-countdown').textContent;

    expect(after).not.toBe(before);
  });
});

describe('getSecondsToMidnight', () => {
  it('counts seconds to the next LOCAL midnight', () => {
    const now = new Date(2026, 7, 17, 23, 0, 0); // local 23:00
    expect(getSecondsToMidnight(now)).toBe(3600);
  });
});

describe('formatCountdown', () => {
  it('formats hh:mm:ss with padded digits', () => {
    expect(formatCountdown(3661, 'en')).toBe('01:01:01');
  });
});
