import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WeekStrip from '../WeekStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('WeekStrip', () => {
  it('lights the days played across the last seven UTC days', () => {
    render(<WeekStrip days={['2026-10-21', '2026-10-23']} todayISO="2026-10-23" />);
    const items = within(screen.getByTestId('week-strip')).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    const played = items.map((li) => li.hasAttribute('data-played'));
    expect(played).toEqual([false, false, false, false, true, false, true]);
  });

  it('shows no lit days for a brand-new player', () => {
    render(<WeekStrip days={[]} todayISO="2026-10-23" />);
    expect(document.querySelectorAll('[data-played]')).toHaveLength(0);
  });
});
