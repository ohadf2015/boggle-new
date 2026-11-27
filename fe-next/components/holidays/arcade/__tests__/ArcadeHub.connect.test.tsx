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

import ArcadeHub from '../ArcadeHub';

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterEach(() => vi.useRealTimers());

describe('ArcadeHub connections', () => {
  it('Given Hanukkah, then the hub links back home, to the holiday daily, to friends and to the event track', () => {
    vi.setSystemTime(new Date('2026-12-06T12:00:00'));
    holiday.mockReturnValue({ holiday: 'hanukkah', resolved: true });
    render(<ArcadeHub />);
    expect(screen.getByTestId('arcade-home')).toHaveAttribute('href', '/he');
    expect(screen.getByTestId('arcade-more-daily')).toHaveAttribute('href', '/he/daily');
    expect(screen.getByTestId('arcade-more-friends')).toHaveAttribute('href', '/he/multiplayer');
    expect(screen.getByTestId('arcade-more-track')).toHaveAttribute('href', '/he#holiday-event');
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
