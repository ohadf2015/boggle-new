import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const holiday = vi.fn();
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => holiday() }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));

import { MoreGames } from '../MoreGames';

describe('MoreGames holiday cartridge', () => {
  it('Given a holiday is on, then the shelf opens with the Holiday Arcade', () => {
    holiday.mockReturnValue({ holiday: 'christmas', resolved: true });
    render(<MoreGames lang="en" t={(k) => k} />);
    const first = screen.getAllByRole('link')[0];
    expect(first).toHaveAttribute('href', '/en/holiday-arcade');
    expect(first).toHaveAttribute('data-testid', 'hp-games-holiday');
  });

  it('Given no holiday, then the shelf has no arcade cartridge', () => {
    holiday.mockReturnValue({ holiday: null, resolved: true });
    render(<MoreGames lang="en" t={(k) => k} />);
    expect(screen.queryByTestId('hp-games-holiday')).toBeNull();
  });
});
