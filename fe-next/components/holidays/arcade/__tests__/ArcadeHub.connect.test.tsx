import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const holiday = vi.fn();
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => holiday() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/he/holiday-arcade',
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'he' }),
}));
vi.mock('../ArcadeGameHost', () => ({ default: () => null }));
vi.mock('@/components/holidays/HolidayEventCard', () => ({ default: ({ inHub }: { inHub?: boolean }) => <div data-testid="event-card" data-in-hub={String(!!inHub)} /> }));

import ArcadeHub from '../ArcadeHub';

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterEach(() => vi.useRealTimers());

describe('ArcadeHub connections', () => {
  it('Given Hanukkah, then the hub holds the event track and links home, to the holiday daily and to friends', () => {
    vi.setSystemTime(new Date('2026-12-06T12:00:00'));
    holiday.mockReturnValue({ holiday: 'hanukkah', resolved: true });
    render(<ArcadeHub />);
    expect(screen.getByTestId('arcade-home')).toHaveAttribute('href', '/he');
    expect(screen.getByTestId('arcade-more-daily')).toHaveAttribute('href', '/he/daily');
    expect(screen.getByTestId('arcade-more-friends')).toHaveAttribute('href', '/he/multiplayer');
    expect(screen.queryByTestId('arcade-more-track')).toBeNull();
    expect(screen.getByTestId('event-card')).toHaveAttribute('data-in-hub', 'true');
    expect(document.getElementById('holiday-event')).not.toBeNull();
    expect(screen.getByTestId('hp-keycaps')).toBeInTheDocument();
  });

  it('Given the third night of Hanukkah, then the hero says which night it is', () => {
    vi.setSystemTime(new Date('2026-12-06T12:00:00'));
    holiday.mockReturnValue({ holiday: 'hanukkah', resolved: true });
    render(<ArcadeHub />);
    expect(screen.getByTestId('arcade-night')).toHaveTextContent('holiday.arcade.lobby.night:{"n":3,"total":8}');
  });

  it('Given Christmas before the first gift day, then no day chip is shown', () => {
    vi.setSystemTime(new Date('2026-12-13T12:00:00'));
    holiday.mockReturnValue({ holiday: 'christmas', resolved: true });
    render(<ArcadeHub />);
    expect(screen.queryByTestId('arcade-night')).toBeNull();
  });
});
