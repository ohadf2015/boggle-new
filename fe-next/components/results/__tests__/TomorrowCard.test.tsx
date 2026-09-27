/**
 * TomorrowCard — RED phase (t_89663cfc "Streak Ignition")
 *
 * Replaces the 3s auto-dismissing TomorrowPreview banner for first-session
 * players with a persistent card: tomorrow's Daily Challenge + a live
 * countdown to LOCAL midnight. Fires `growth:tomorrow_card_shown` once per
 * view with the seconds remaining.
 */

import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockTrackGrowthEvent, mockReadGamesCompletedCount } = vi.hoisted(() => ({
  mockTrackGrowthEvent: vi.fn(),
  mockReadGamesCompletedCount: vi.fn(),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: any[]) => mockTrackGrowthEvent(...args),
}));

vi.mock('@/utils/gamesCompletedCount', () => ({
  readGamesCompletedCount: () => mockReadGamesCompletedCount(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (key === 'results.tomorrowCard.countdown' && params) {
        return `New puzzle in ${params.time}`;
      }
      const translations: Record<string, string> = {
        'results.tomorrowCard.title': 'TOMORROW: new Daily Challenge',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

import TomorrowCard, { formatCountdown, getSecondsToMidnight } from '../TomorrowCard';

describe('TomorrowCard', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
    mockReadGamesCompletedCount.mockReturnValue(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the title and a live hh:mm:ss countdown for a first-session player', () => {
    render(<TomorrowCard />);

    expect(screen.getByText('TOMORROW: new Daily Challenge')).toBeInTheDocument();
    expect(screen.getByTestId('tomorrow-countdown').textContent).toMatch(
      /^New puzzle in \d{2}:\d{2}:\d{2}$/,
    );
  });

  it('fires growth:tomorrow_card_shown once with seconds_to_midnight', () => {
    render(<TomorrowCard />);

    expect(mockTrackGrowthEvent).toHaveBeenCalledTimes(1);
    const [event, data] = mockTrackGrowthEvent.mock.calls[0];
    expect(event).toBe('tomorrow_card_shown');
    expect(data.seconds_to_midnight).toBeGreaterThan(0);
    expect(data.seconds_to_midnight).toBeLessThanOrEqual(86400);
  });

  it('does not render for returning players (second game onwards)', () => {
    mockReadGamesCompletedCount.mockReturnValue(5);
    const { container } = render(<TomorrowCard />);

    expect(container).toBeEmptyDOMElement();
    expect(mockTrackGrowthEvent).not.toHaveBeenCalled();
  });

  it('ticks the countdown down every second', () => {
    vi.useFakeTimers();
    render(<TomorrowCard />);

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

  it('is a full day just after midnight', () => {
    const now = new Date(2026, 7, 17, 0, 0, 1);
    expect(getSecondsToMidnight(now)).toBe(86399);
  });
});

describe('formatCountdown', () => {
  it('formats hh:mm:ss with padded units', () => {
    expect(formatCountdown(7 * 3600 + 42 * 60 + 18, 'en')).toBe('07:42:18');
    expect(formatCountdown(0, 'en')).toBe('00:00:00');
  });
});
