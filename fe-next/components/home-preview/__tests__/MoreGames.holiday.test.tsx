import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => ({ holiday: 'christmas', theme: 'christmas', resolved: true }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));

import { MoreGames } from '../MoreGames';

describe('MoreGames during a holiday', () => {
  it('Given a holiday is live, then the shelf keeps the regular games only (the holiday has its own home card)', () => {
    render(<MoreGames lang="en" t={(k) => k} />);
    expect(screen.queryByTestId('hp-games-holiday')).toBeNull();
    expect(screen.getAllByRole('link').some((a) => a.getAttribute('href')?.includes('holiday-arcade'))).toBe(false);
  });
});
