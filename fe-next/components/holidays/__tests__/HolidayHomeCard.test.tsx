import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const state = vi.fn();
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => state() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));

import HolidayHomeCard from '../HolidayHomeCard';

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterEach(() => vi.useRealTimers());

describe('HolidayHomeCard', () => {
  it('Given Christmas is live, then home shows one card that opens the holiday hub with today\'s gift', () => {
    vi.setSystemTime(new Date('2026-12-16T12:00:00'));
    state.mockReturnValue({ holiday: 'christmas', theme: 'christmas', phase: 'live', resolved: true });
    render(<HolidayHomeCard />);
    const card = screen.getByTestId('holiday-home-card');
    expect(card).toHaveAttribute('href', '/en/holiday-arcade');
    expect(card.textContent).toContain('holiday.event.christmas.title');
    expect(card.textContent).toContain('holiday.arcade.lobby.day:{"n":3,"total":12}');
  });

  it('Given the coming-soon days before Hanukkah, then the card teases the opening date and links nowhere', () => {
    vi.setSystemTime(new Date('2026-12-02T12:00:00'));
    state.mockReturnValue({ holiday: null, theme: 'hanukkah', phase: 'preview', resolved: true });
    render(<HolidayHomeCard />);
    const card = screen.getByTestId('holiday-home-card');
    expect(card).not.toHaveAttribute('href');
    expect(card.textContent).toContain('holiday.home.opens');
  });

  it('Given no holiday, then nothing renders', () => {
    state.mockReturnValue({ holiday: null, theme: null, phase: 'off', resolved: true });
    const { container } = render(<HolidayHomeCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
