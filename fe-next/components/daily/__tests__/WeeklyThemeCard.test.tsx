import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));

import { WeeklyThemeCard, daysLeftInWeek, boardLetters } from '../WeeklyThemeCard';
import { en } from '@/translations/en';

const t = (key: string, params: Record<string, string | number> = {}) => {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
  return typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : key;
};

describe('WeeklyThemeCard', () => {
  it('counts the days left in the ISO week, today included', () => {
    expect(daysLeftInWeek(new Date('2026-11-09T12:00:00Z'))).toBe(7); // Monday
    expect(daysLeftInWeek(new Date('2026-11-14T12:00:00Z'))).toBe(2); // Saturday
    expect(daysLeftInWeek(new Date('2026-11-15T12:00:00Z'))).toBe(1); // Sunday
  });

  it('spells the theme on the mini board, padded to eight tiles', () => {
    expect(boardLetters('Gold Rush')).toEqual(['G', 'O', 'L', 'D', 'R', 'U', 'S', 'H']);
    expect(boardLetters('S')).toEqual(['S', '?', '?', '?', '?', '?', '?', '?']);
    expect(boardLetters('בהלה לזהב')).toHaveLength(8);
  });

  it('renders the full card as a poster: kicker, theme, countdown, gold tile and play', () => {
    render(<WeeklyThemeCard lang="en" t={t} source="daily_hub" />);
    const card = screen.getByTestId('weekly-theme-card');
    expect(card.getAttribute('href')).toBe('/en/quick-play?weekly=1');
    expect(screen.getByTestId('weekly-countdown').textContent).toMatch(/Ends in \d days|Last day!/);
    expect(screen.getByTestId('weekly-gold-tile')).toBeInTheDocument();
    expect(card.textContent).toContain(en.quickLoop.weekly.play);
  });

  it('keeps the compact variant a one-line chip', () => {
    render(<WeeklyThemeCard lang="en" t={t} source="home" compact />);
    expect(screen.queryByTestId('weekly-countdown')).toBeNull();
    expect(screen.getByTestId('weekly-theme-card')).toBeInTheDocument();
  });
});
